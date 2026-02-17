import { useState, useCallback, useEffect } from "react";
import { Camera, Mic, Video, Check, AlertCircle, Loader2, Film, Settings2 } from "lucide-react";
import { useAppStore } from "~/app/lib/store";
import { generateVideo, checkJobStatus, estimateCost } from "~/app/lib/video/providers";
// Simple render time estimate (seconds) per provider
const RENDER_SPEEDS: Record<string, number> = { kling: 1.0, minimax: 0.7, wan: 1.2 };
function estimateRenderTime(provider: string, duration: number) {
  const speed = RENDER_SPEEDS[provider] || 1.0;
  return Math.round(duration * speed);
}
import type { StoryboardScene, VideoGenerationParams } from "~/app/types";

export function ProductionBoard({ guided }: { guided?: boolean }) {
  const { scenes, updateScene, characters, visualPreset, setVisualPreset, selectedProvider, setSelectedProvider } = useAppStore();
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());

  const handleGenerateClip = useCallback(async (scene: StoryboardScene) => {
    setGeneratingIds((prev) => new Set(prev).add(scene.id));
    // Store job start time for ETA
    const startTime = Date.now();
    updateScene(scene.id, { status: "generating", jobStart: startTime });

    try {
      const charPhotos = characters
        .filter((c) => scene.characters.includes(c.name))
        .map((c) => c.photoUrl)
        .filter(Boolean);

      const params: VideoGenerationParams = {
        prompt: scene.prompt,
        imageUrl: (charPhotos[0] as string) || undefined,
        duration: scene.duration,
        aspectRatio: (visualPreset.aspectRatio as "16:9" | "9:16" | "1:1") || "16:9",
        cameraMovement: scene.cameraAngle,
        stylePreset: visualPreset.style,
      };

      const result = await generateVideo(params, selectedProvider);

      // Poll for completion
      const poll = async () => {
        let attempts = 0;
        while (attempts < 60) {
          await new Promise((r) => setTimeout(r, 5000));
          const status = await checkJobStatus(selectedProvider === "auto" ? "kling" : selectedProvider, result.jobId);
          if (status.status === "completed" && status.videoUrl) {
            updateScene(scene.id, { status: "completed", videoUrl: status.videoUrl });
            break;
          }
          if (status.status === "failed") {
            updateScene(scene.id, { status: "error" });
            break;
          }
          attempts++;
        }
        if (attempts >= 60) updateScene(scene.id, { status: "error" });
      };

      poll();
    } catch (err) {
      console.error("Generation failed:", err);
      updateScene(scene.id, { status: "error" });
    } finally {
      setGeneratingIds((prev) => {
        const next = new Set(prev);
        next.delete(scene.id);
        return next;
      });
    }
  }, [characters, selectedProvider, updateScene, visualPreset]);

  const provider = selectedProvider === "auto" ? "kling" : selectedProvider;
  const totalCost = scenes.reduce((acc, s) => acc + estimateCost(provider, s.duration), 0);
  const totalRenderTime = scenes.reduce((acc, s) => acc + estimateRenderTime(provider, s.duration), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold text-white mb-1">Render Scenes</h2>
          <p className="text-stone-400 text-sm">Generate cinematic video clips for each storyboarded scene.</p>
          {guided && scenes.length === 0 && (
            <div className="mt-2 text-emerald-400 text-xs font-semibold">No scenes to render. Complete your storyboard first.</div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-500">Est. cost: ${totalCost.toFixed(2)}</span>
          <span className="text-xs text-stone-500">Est. render: {totalRenderTime}s</span>
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value as any)}
            className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="auto">Auto-Select</option>
            <option value="kling">Kling 1.6 Pro</option>
            <option value="minimax">MiniMax (Budget)</option>
            <option value="wan">WAN (Motion)</option>
          </select>
        </div>
      </div>

      {/* Visual Consistency Panel */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="w-4 h-4 text-emerald-400" />
          <h3 className="font-medium text-emerald-400 text-sm">Visual Consistency</h3>
          <span className="ml-auto text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded">Applied to all prompts</span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-stone-500">Style</label>
            <select value={visualPreset.style} onChange={(e) => setVisualPreset({ style: e.target.value })} className="w-full bg-stone-950 border border-stone-800 rounded px-3 py-2 text-sm text-white">
              <option value="cinematic">Cinematic Realism</option>
              <option value="anime">Anime</option>
              <option value="noir">Film Noir</option>
              <option value="vintage">Vintage</option>
              <option value="documentary">Documentary</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-stone-500">Lighting</label>
            <select value={visualPreset.lighting} onChange={(e) => setVisualPreset({ lighting: e.target.value })} className="w-full bg-stone-950 border border-stone-800 rounded px-3 py-2 text-sm text-white">
              <option value="natural">Natural</option>
              <option value="dramatic">Dramatic</option>
              <option value="golden">Golden Hour</option>
              <option value="neon">Neon</option>
              <option value="noir">Noir</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-stone-500">Default Camera</label>
            <select value={visualPreset.camera} onChange={(e) => setVisualPreset({ camera: e.target.value })} className="w-full bg-stone-950 border border-stone-800 rounded px-3 py-2 text-sm text-white">
              <option value="medium">Medium Shot</option>
              <option value="wide">Wide Shot</option>
              <option value="closeup">Close-Up</option>
              <option value="dolly">Dolly</option>
              <option value="static">Static</option>
              <option value="aerial">Aerial</option>
              <option value="handheld">Handheld</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-stone-500">Aspect Ratio</label>
            <select value={visualPreset.aspectRatio} onChange={(e) => setVisualPreset({ aspectRatio: e.target.value })} className="w-full bg-stone-950 border border-stone-800 rounded px-3 py-2 text-sm text-white">
              <option value="16:9">16:9 Landscape</option>
              <option value="9:16">9:16 Portrait</option>
              <option value="1:1">1:1 Square</option>
            </select>
          </div>
        </div>
      </div>

      {/* Scenes */}
      <div className="space-y-4">
        {scenes.map((scene) => (
          <SceneCard
            key={scene.id}
            scene={scene}
            isGenerating={generatingIds.has(scene.id) || scene.status === "generating"}
            onGenerate={() => handleGenerateClip(scene)}
          />
        ))}
        {scenes.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-stone-800 rounded-xl">
            <Film className="w-12 h-12 text-stone-700 mx-auto mb-4" />
            <p className="text-stone-500">No scenes generated yet. Complete Pre-Production first.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SceneCard({ scene, isGenerating, onGenerate }: { scene: StoryboardScene; isGenerating: boolean; onGenerate: () => void }) {
  const provider = scene.provider || "kling";
  const renderEstimate = estimateRenderTime(provider, scene.duration);
  // mm:ss formatting
  function formatTime(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
  // Live ETA for rendering jobs
  const [liveEta, setLiveEta] = useState<number | null>(null);
  useEffect(() => {
    if (scene.status === "generating" && scene.jobStart) {
      const interval = setInterval(() => {
        setLiveEta(Math.floor((Date.now() - scene.jobStart) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setLiveEta(null);
    }
  }, [scene.status, scene.jobStart]);
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 flex gap-5 hover:border-stone-700 transition-all">
      <div className="w-14 h-14 rounded-lg bg-stone-950 flex items-center justify-center border border-stone-800 flex-shrink-0">
        <span className="font-serif text-xl font-bold text-emerald-500">
          {scene.sceneNumber.toString().padStart(2, "0")}
        </span>
      </div>
      <div className="flex-1 space-y-3 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-medium text-white">{scene.title || scene.description}</h3>
            <p className="text-sm text-stone-400 mt-0.5 line-clamp-2">{scene.description}</p>
            <div className="flex items-center gap-4 mt-1.5 text-xs text-stone-500">
              <span className="flex items-center gap-1"><Camera className="w-3.5 h-3.5" /> {scene.cameraAngle}</span>
              <span className="flex items-center gap-1"><Mic className="w-3.5 h-3.5" /> {scene.lighting}</span>
              <span>{scene.duration}s</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {scene.status === "completed" && <span className="text-emerald-400 flex items-center gap-1 text-xs"><Check className="w-3.5 h-3.5" /> Rendered</span>}
            {scene.status === "error" && <span className="text-red-400 flex items-center gap-1 text-xs"><AlertCircle className="w-3.5 h-3.5" /> Failed</span>}
          </div>
        </div>

        {scene.dialog && (
          <div className="bg-stone-950 border-l-2 border-emerald-500/50 pl-3 py-1.5 text-stone-400 italic text-sm">
            &ldquo;{scene.dialog}&rdquo;
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex gap-1.5 flex-wrap">
            {scene.characters.map((char) => (
              <span key={char} className="text-xs bg-stone-800 text-stone-400 px-2 py-0.5 rounded">{char}</span>
            ))}
          </div>
          {scene.videoUrl ? (
            <video src={scene.videoUrl} className="w-32 h-20 rounded bg-black object-cover" controls />
          ) : (
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={onGenerate}
                disabled={isGenerating}
                className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                {isGenerating ? "Rendering..." : "Generate Clip"}
              </button>
              <span className="text-xs text-stone-500">
                {isGenerating && liveEta !== null
                  ? `Elapsed: ${formatTime(liveEta)}`
                  : `Est. ${formatTime(renderEstimate)}`}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
