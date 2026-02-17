import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Download, Film, Settings, Archive, Loader2, Check, AlertCircle, Volume2, VolumeX, FileText, Music } from "lucide-react";
import { useAppStore } from "~/app/lib/store";
import { speakDialogueUnified, stopDialogue, type VoiceConfig } from "~/app/lib/tts";

type ExportMode = "preview" | "ffmpeg" | "zip";

export function VideoCompiler({ guided }: { guided?: boolean }) {
  const { scenes, characters, apiKeys, finalVideoUrl, setFinalVideoUrl } = useAppStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentScene, setCurrentScene] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [exportMode, setExportMode] = useState<ExportMode>("preview");
  const [compiling, setCompiling] = useState(false);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [compileProgress, setCompileProgress] = useState(0);
  const [zipUrl, setZipUrl] = useState<string | null>(null);
  const [dialogueEnabled, setDialogueEnabled] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stopSpeechRef = useRef<(() => void) | null>(null);

  const completedScenes = scenes.filter((s) => s.videoUrl && s.status === "completed");
  const totalDuration = completedScenes.reduce((acc, s) => acc + s.duration, 0);

  /** Build voice config for a scene's first dialogue character */
  const buildVoiceConfig = useCallback((sceneIdx: number): VoiceConfig => {
    const scene = completedScenes[sceneIdx];
    if (!scene) return { engine: "browser", profileId: "male-neutral" };
    const char = characters.find((c) => scene.characters.includes(c.name));
    return {
      engine: char?.voiceEngine || "browser",
      profileId: char?.voiceProfile || "male-neutral",
      elevenLabsVoiceId: char?.elevenLabsVoiceId,
      elevenLabsApiKey: apiKeys.elevenlabs,
    };
  }, [completedScenes, characters, apiKeys.elevenlabs]);

  /** Speak dialogue for a scene during preview */
  const speakSceneDialogue = useCallback(async (sceneIdx: number) => {
    // Stop any prior speech
    if (stopSpeechRef.current) { stopSpeechRef.current(); stopSpeechRef.current = null; }
    stopDialogue();
    if (!dialogueEnabled) return;
    const scene = completedScenes[sceneIdx];
    if (!scene?.dialog) return;
    const config = buildVoiceConfig(sceneIdx);
    const stopFn = await speakDialogueUnified(scene.dialog, config);
    stopSpeechRef.current = stopFn;
  }, [completedScenes, dialogueEnabled, buildVoiceConfig]);

  const handlePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        if (stopSpeechRef.current) { stopSpeechRef.current(); stopSpeechRef.current = null; }
        stopDialogue();
      } else {
        videoRef.current.play();
        speakSceneDialogue(currentScene);
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVideoEnded = () => {
    // Stop speech for the scene that just ended
    if (stopSpeechRef.current) { stopSpeechRef.current(); stopSpeechRef.current = null; }
    stopDialogue();

    if (currentScene < completedScenes.length - 1) {
      setTransitioning(true);
      // Crossfade transition effect
      setTimeout(() => {
        const nextIdx = currentScene + 1;
        setCurrentScene(nextIdx);
        setTransitioning(false);
        // Auto-play next scene
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.play().catch(() => {});
          }
          speakSceneDialogue(nextIdx);
        }, 100);
      }, 500);
    } else {
      setIsPlaying(false);
      setCurrentScene(0);
    }
  };

  // ============================================================
  // EXPORT: FFmpeg Concatenation
  // ============================================================
  const handleFFmpegCompile = useCallback(async () => {
    if (completedScenes.length === 0) return;
    setCompiling(true);
    setCompileError(null);
    setCompileProgress(0);

    try {
      // Dynamically import FFmpeg
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { fetchFile, toBlobURL } = await import("@ffmpeg/util");

      const ffmpeg = new FFmpeg();

      ffmpeg.on("progress", ({ progress }) => {
        setCompileProgress(Math.round(progress * 100));
      });

      // Load FFmpeg WASM
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });

      // Download and write each clip
      const fileList: string[] = [];
      for (let i = 0; i < completedScenes.length; i++) {
        const scene = completedScenes[i];
        setCompileProgress(Math.round(((i + 1) / completedScenes.length) * 30));
        const response = await fetch(scene.videoUrl!);
        const data = await response.arrayBuffer();
        const filename = `scene_${i}.mp4`;
        await ffmpeg.writeFile(filename, new Uint8Array(data));
        fileList.push(`file '${filename}'`);
      }

      // Write concat file list
      await ffmpeg.writeFile("filelist.txt", fileList.join("\n"));

      setCompileProgress(40);

      // Concatenate
      await ffmpeg.exec([
        "-f", "concat",
        "-safe", "0",
        "-i", "filelist.txt",
        "-c", "copy",
        "-movflags", "+faststart",
        "output.mp4",
      ]);

      setCompileProgress(90);

      // Read output
      const outputData = await ffmpeg.readFile("output.mp4");
      const blob = new Blob([outputData as BlobPart], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);

      setFinalVideoUrl(url);
      setCompileProgress(100);
    } catch (err: any) {
      console.error("FFmpeg compile failed:", err);
      setCompileError(
        err.message?.includes("SharedArrayBuffer")
          ? "FFmpeg requires SharedArrayBuffer. Enable cross-origin isolation or use the Zip export instead."
          : `Compilation failed: ${err.message || "Unknown error"}. Try Zip export as fallback.`
      );
    } finally {
      setCompiling(false);
    }
  }, [completedScenes, setFinalVideoUrl]);

  // ============================================================
  // EXPORT: Zip Download
  // ============================================================
  const handleZipExport = useCallback(async () => {
    if (completedScenes.length === 0) return;
    setCompiling(true);
    setCompileError(null);
    setCompileProgress(0);

    try {
      // Dynamic import of JSZip
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      // Download and add each clip
      for (let i = 0; i < completedScenes.length; i++) {
        const scene = completedScenes[i];
        setCompileProgress(Math.round(((i + 1) / completedScenes.length) * 80));
        const response = await fetch(scene.videoUrl!);
        const data = await response.arrayBuffer();
        const filename = `scene_${String(i + 1).padStart(2, "0")}_${scene.title.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30)}.mp4`;
        zip.file(filename, data);
      }

      setCompileProgress(85);

      // Add a metadata file
      const metadata = {
        project: "AI Director's Chair Export",
        exportDate: new Date().toISOString(),
        scenes: completedScenes.map((s, i) => ({
          order: i + 1,
          title: s.title,
          duration: s.duration,
          cameraAngle: s.cameraAngle,
          lighting: s.lighting,
          characters: s.characters,
        })),
        totalDuration,
        totalScenes: completedScenes.length,
      };
      zip.file("project_metadata.json", JSON.stringify(metadata, null, 2));

      setCompileProgress(90);

      // Generate zip
      const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 1 }, // Fast compression for video files
      });

      const url = URL.createObjectURL(blob);
      setZipUrl(url);
      setCompileProgress(100);

      // Trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download = `aidc_export_${Date.now()}.zip`;
      a.click();
    } catch (err: any) {
      console.error("Zip export failed:", err);
      setCompileError(`Zip export failed: ${err.message || "Unknown error"}`);
    } finally {
      setCompiling(false);
    }
  }, [completedScenes, totalDuration]);

  // ============================================================
  // EXPORT: In-browser preview (already playing above)
  // ============================================================
  const handleDownloadFinal = () => {
    if (finalVideoUrl) {
      const a = document.createElement("a");
      a.href = finalVideoUrl;
      a.download = `aidc_final_cut_${Date.now()}.mp4`;
      a.click();
    }
  };

  // ============================================================
  // EXPORT: SRT Subtitles (Feature #8)
  // ============================================================
  const handleExportSRT = useCallback(() => {
    if (completedScenes.length === 0) return;
    let srtContent = "";
    let cueIdx = 1;
    let currentTime = 0;

    for (const scene of completedScenes) {
      if (!scene.dialog) {
        currentTime += scene.duration;
        continue;
      }
      const startH = Math.floor(currentTime / 3600);
      const startM = Math.floor((currentTime % 3600) / 60);
      const startS = Math.floor(currentTime % 60);
      const startMs = Math.round((currentTime % 1) * 1000);

      const endTime = currentTime + Math.min(scene.duration, scene.dialog.length * 0.06 + 1.5);
      const endH = Math.floor(endTime / 3600);
      const endM = Math.floor((endTime % 3600) / 60);
      const endS = Math.floor(endTime % 60);
      const endMs = Math.round((endTime % 1) * 1000);

      const pad2 = (n: number) => String(n).padStart(2, "0");
      const pad3 = (n: number) => String(n).padStart(3, "0");

      const speaker = scene.characters.length > 0 ? scene.characters[0] : "NARRATOR";
      srtContent += `${cueIdx}\n`;
      srtContent += `${pad2(startH)}:${pad2(startM)}:${pad2(startS)},${pad3(startMs)} --> ${pad2(endH)}:${pad2(endM)}:${pad2(endS)},${pad3(endMs)}\n`;
      srtContent += `[${speaker}] ${scene.dialog}\n\n`;
      cueIdx++;
      currentTime += scene.duration;
    }

    if (!srtContent.trim()) {
      alert("No dialogue found in completed scenes.");
      return;
    }

    const blob = new Blob([srtContent], { type: "text/srt" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aidc_subtitles_${Date.now()}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [completedScenes]);

  // ============================================================
  // EXPORT: Background Music Layer (Feature #9)
  // ============================================================
  const { audioTrack } = useAppStore();
  const [bgMusicFile, setBgMusicFile] = useState<File | null>(null);
  const bgMusicInputRef = useRef<HTMLInputElement>(null);

  const handleBgMusicSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setBgMusicFile(file);
  }, []);

  const handleFFmpegCompileWithMusic = useCallback(async () => {
    if (completedScenes.length === 0) return;
    const musicSource = bgMusicFile || (audioTrack?.url ? audioTrack : null);
    if (!musicSource && !finalVideoUrl) {
      // No music and no compiled video, just do normal compile
      handleFFmpegCompile();
      return;
    }
    if (!finalVideoUrl) {
      alert("Compile the final cut first, then add background music.");
      return;
    }

    setCompiling(true);
    setCompileError(null);
    setCompileProgress(0);

    try {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { fetchFile, toBlobURL } = await import("@ffmpeg/util");

      const ffmpeg = new FFmpeg();
      ffmpeg.on("progress", ({ progress }) => setCompileProgress(Math.round(progress * 100)));

      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });

      // Write video
      const videoResponse = await fetch(finalVideoUrl);
      await ffmpeg.writeFile("video.mp4", new Uint8Array(await videoResponse.arrayBuffer()));

      // Write music
      let musicData: ArrayBuffer;
      if (bgMusicFile) {
        musicData = await bgMusicFile.arrayBuffer();
      } else if (audioTrack?.url) {
        const r = await fetch(audioTrack.url);
        musicData = await r.arrayBuffer();
      } else {
        setCompiling(false);
        return;
      }
      await ffmpeg.writeFile("music.mp3", new Uint8Array(musicData));

      setCompileProgress(30);

      // Mix: keep original audio (if any), add music at reduced volume, loop if needed
      await ffmpeg.exec([
        "-i", "video.mp4",
        "-i", "music.mp3",
        "-filter_complex", "[1:a]volume=0.3,aloop=loop=-1:size=2e+09[bg];[0:a][bg]amix=inputs=2:duration=first:dropout_transition=2[out]",
        "-map", "0:v",
        "-map", "[out]",
        "-c:v", "copy",
        "-shortest",
        "-movflags", "+faststart",
        "output_with_music.mp4",
      ]);

      setCompileProgress(90);

      const outputData = await ffmpeg.readFile("output_with_music.mp4");
      const blob = new Blob([outputData as BlobPart], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      setFinalVideoUrl(url);
      setCompileProgress(100);
    } catch (err: any) {
      console.error("Music mix failed:", err);
      setCompileError(
        err.message?.includes("SharedArrayBuffer")
          ? "FFmpeg requires SharedArrayBuffer. Enable cross-origin isolation."
          : `Music mix failed: ${err.message || "Unknown error"}`
      );
    } finally {
      setCompiling(false);
    }
  }, [completedScenes, bgMusicFile, audioTrack, finalVideoUrl, handleFFmpegCompile, setFinalVideoUrl]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-serif font-bold text-white">Compile & Export</h2>
        <p className="text-stone-400">Preview your scenes with transitions, compile with FFmpeg, or export as a zip.</p>
        {guided && completedScenes.length === 0 && (
          <div className="mt-2 text-emerald-400 text-xs font-semibold">Render all scenes before compiling your final cut.</div>
        )}
      </div>

      <div className="bg-stone-900 border border-stone-800 rounded-xl p-8">
        {/* Preview Player */}
        <div
          ref={containerRef}
          className={`aspect-video bg-black rounded-lg mb-6 relative overflow-hidden border border-stone-800 transition-opacity duration-500 ${
            transitioning ? "opacity-30" : "opacity-100"
          }`}
        >
          {completedScenes[currentScene]?.videoUrl ? (
            <video
              ref={videoRef}
              src={completedScenes[currentScene].videoUrl}
              className="w-full h-full object-contain"
              onEnded={handleVideoEnded}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <Play className="w-16 h-16 text-stone-700 mx-auto mb-4" />
                <p className="text-stone-500">Preview will appear here when scenes are rendered</p>
              </div>
            </div>
          )}

          {/* Play overlay */}
          {completedScenes.length > 0 && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end justify-center pb-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePlay}
                  className="w-12 h-12 bg-emerald-600 hover:bg-emerald-500 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>
                {completedScenes.length > 0 && (
                  <span className="text-white text-xs bg-black/50 px-2 py-1 rounded">
                    Scene {currentScene + 1} / {completedScenes.length}
                  </span>
                )}
                <button
                  onClick={() => setDialogueEnabled((d) => !d)}
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                    dialogueEnabled
                      ? "bg-emerald-600/30 text-emerald-300"
                      : "bg-black/50 text-stone-400"
                  }`}
                  title={dialogueEnabled ? "Dialogue voice on" : "Dialogue voice off"}
                >
                  {dialogueEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  Voice
                </button>
              </div>
            </div>
          )}

          {/* Transition overlay */}
          {transitioning && (
            <div className="absolute inset-0 bg-black flex items-center justify-center">
              <span className="text-stone-500 text-sm animate-pulse">Transitioning...</span>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="space-y-2 mb-6">
          <h3 className="font-serif text-lg text-white">Timeline</h3>
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>0:00</span>
            <span>{Math.floor(totalDuration / 60)}:{String(totalDuration % 60).padStart(2, "0")}</span>
          </div>
          <div className="h-12 bg-stone-950 rounded-lg border border-stone-800 flex items-center px-2 gap-1 overflow-x-auto">
            {completedScenes.map((scene, idx) => (
              <div
                key={scene.id}
                onClick={() => {
                  setCurrentScene(idx);
                  if (videoRef.current) {
                    videoRef.current.load();
                    if (isPlaying) {
                      setTimeout(() => videoRef.current?.play(), 100);
                    }
                  }
                }}
                className={`h-8 rounded flex-shrink-0 flex items-center justify-center text-xs font-medium cursor-pointer transition-all ${
                  idx === currentScene
                    ? "bg-emerald-600 text-white"
                    : "bg-stone-800 text-stone-400 hover:bg-stone-700"
                }`}
                style={{ width: `${Math.max(48, (scene.duration / Math.max(totalDuration, 1)) * 600)}px` }}
              >
                <span className="truncate px-1">{scene.duration}s - {scene.title}</span>
              </div>
            ))}
            {completedScenes.length === 0 && (
              <p className="text-stone-600 text-xs italic px-2">No rendered clips available</p>
            )}
          </div>
        </div>

        {/* Individual Scene List */}
        {completedScenes.length > 0 && (
          <div className="space-y-2 mb-6">
            <h3 className="font-serif text-lg text-white">Scene Clips</h3>
            <div className="space-y-1">
              {completedScenes.map((scene, idx) => (
                <div
                  key={scene.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all cursor-pointer ${
                    idx === currentScene
                      ? "bg-emerald-600/10 border border-emerald-500/30"
                      : "bg-stone-950 border border-stone-800 hover:border-stone-700"
                  }`}
                  onClick={() => {
                    setCurrentScene(idx);
                    if (videoRef.current) {
                      videoRef.current.load();
                    }
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-stone-500 font-mono text-xs w-6 text-center flex-shrink-0">{idx + 1}</span>
                    <span className="text-white truncate">{scene.title}</span>
                    <span className="text-stone-500 text-xs flex-shrink-0">{scene.duration}s</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const a = document.createElement("a");
                      a.href = scene.videoUrl!;
                      a.download = `scene_${String(idx + 1).padStart(2, "0")}_${scene.title.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30)}.mp4`;
                      a.click();
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded text-xs transition-all flex-shrink-0"
                    title={`Download ${scene.title}`}
                  >
                    <Download className="w-3 h-3" />
                    Save
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Export Options */}
        <div className="space-y-4 pt-4 border-t border-stone-800">
          <h3 className="font-serif text-lg text-white">Export Options</h3>

          {/* Export Mode Selector */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setExportMode("ffmpeg")}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                exportMode === "ffmpeg"
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-stone-800 hover:border-stone-600 bg-stone-950"
              }`}
            >
              <Film className="w-5 h-5 text-emerald-400 mb-2" />
              <div className="text-sm font-medium text-white">FFmpeg Compile</div>
              <p className="text-[10px] text-stone-500 mt-1">Concatenate all clips into a single MP4 file</p>
            </button>

            <button
              onClick={() => setExportMode("zip")}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                exportMode === "zip"
                  ? "border-blue-500/50 bg-blue-500/5"
                  : "border-stone-800 hover:border-stone-600 bg-stone-950"
              }`}
            >
              <Archive className="w-5 h-5 text-blue-400 mb-2" />
              <div className="text-sm font-medium text-white">Download ZIP</div>
              <p className="text-[10px] text-stone-500 mt-1">All clips + metadata for external editing</p>
            </button>

            <button
              onClick={() => setExportMode("preview")}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                exportMode === "preview"
                  ? "border-purple-500/50 bg-purple-500/5"
                  : "border-stone-800 hover:border-stone-600 bg-stone-950"
              }`}
            >
              <Play className="w-5 h-5 text-purple-400 mb-2" />
              <div className="text-sm font-medium text-white">In-Browser Preview</div>
              <p className="text-[10px] text-stone-500 mt-1">Sequential playback with crossfade transitions</p>
            </button>
          </div>

          {/* Compile Error */}
          {compileError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {compileError}
            </div>
          )}

          {/* Progress Bar */}
          {compiling && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-400">
                <span>{exportMode === "ffmpeg" ? "Compiling with FFmpeg..." : "Creating ZIP archive..."}</span>
                <span>{compileProgress}%</span>
              </div>
              <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${compileProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-stone-400">
              <Settings className="w-4 h-4" />
              <span>{completedScenes.length} clips · {totalDuration}s total</span>
            </div>
            <div className="flex gap-3">
              {exportMode === "ffmpeg" && (
                <>
                  <button
                    onClick={handleFFmpegCompile}
                    disabled={completedScenes.length === 0 || compiling}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-800 disabled:text-stone-600 text-white font-medium px-6 py-3 rounded-lg flex items-center gap-2 transition-all"
                  >
                    {compiling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
                    {compiling ? "Compiling..." : "Compile Final Cut"}
                  </button>
                  {finalVideoUrl && (
                    <button
                      onClick={handleDownloadFinal}
                      className="px-5 py-3 bg-stone-800 hover:bg-stone-700 text-white rounded-lg flex items-center gap-2 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      Download MP4
                    </button>
                  )}
                </>
              )}
              {exportMode === "zip" && (
                <button
                  onClick={handleZipExport}
                  disabled={completedScenes.length === 0 || compiling}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-stone-800 disabled:text-stone-600 text-white font-medium px-6 py-3 rounded-lg flex items-center gap-2 transition-all"
                >
                  {compiling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                  {compiling ? "Creating ZIP..." : "Export ZIP"}
                </button>
              )}
              {exportMode === "preview" && (
                <div className="flex items-center gap-2 text-sm text-stone-400">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Use the player above to preview with transitions</span>
                </div>
              )}
            </div>
          </div>

          {/* Subtitle & Music Row (Features #8, #9) */}
          <div className="flex items-center gap-3 pt-2">
            {/* SRT Export */}
            <button
              onClick={handleExportSRT}
              disabled={completedScenes.length === 0}
              className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-300 hover:text-white px-4 py-2 rounded-lg text-sm transition-colors"
              title="Export subtitles as SRT file from scene dialogue"
            >
              <FileText className="w-4 h-4" />
              Export SRT Subtitles
            </button>

            {/* Background Music */}
            <input ref={bgMusicInputRef} type="file" accept="audio/*" className="hidden" onChange={handleBgMusicSelect} />
            <button
              onClick={() => bgMusicInputRef.current?.click()}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                bgMusicFile || audioTrack?.url
                  ? "bg-purple-600/20 text-purple-400 border border-purple-500/30"
                  : "bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white"
              }`}
            >
              <Music className="w-4 h-4" />
              {bgMusicFile ? bgMusicFile.name.substring(0, 20) : audioTrack?.url ? audioTrack.filename : "Add Background Music"}
            </button>

            {(bgMusicFile || audioTrack?.url) && finalVideoUrl && (
              <button
                onClick={handleFFmpegCompileWithMusic}
                disabled={compiling}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-stone-800 disabled:text-stone-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
              >
                {compiling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Music className="w-4 h-4" />}
                Merge Music
              </button>
            )}
          </div>

          {/* FFmpeg compile success */}
          {finalVideoUrl && exportMode === "ffmpeg" && !compiling && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-lg text-sm flex items-center gap-2">
              <Check className="w-4 h-4" />
              Final cut compiled successfully. Click "Download MP4" to save.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
