import { useState, useRef } from "react";
import { Play, Pause, Download, Film, Settings } from "lucide-react";
import { useAppStore } from "~/app/lib/store";

export function VideoCompiler() {
  const { scenes, finalVideoUrl, setFinalVideoUrl } = useAppStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentScene, setCurrentScene] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const completedScenes = scenes.filter((s) => s.videoUrl && s.status === "completed");
  const totalDuration = completedScenes.reduce((acc, s) => acc + s.duration, 0);

  const handlePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVideoEnded = () => {
    if (currentScene < completedScenes.length - 1) {
      setCurrentScene((c) => c + 1);
    } else {
      setIsPlaying(false);
      setCurrentScene(0);
    }
  };

  const handleCompile = () => {
    if (completedScenes.length === 0) return;
    // In production, use FFmpeg.wasm for real concatenation
    // For now, set first clip as preview
    setFinalVideoUrl(completedScenes[0].videoUrl || null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-serif font-bold text-white">Final Cut</h2>
        <p className="text-stone-400">Compile and export your film</p>
      </div>

      <div className="bg-stone-900 border border-stone-800 rounded-xl p-8">
        {/* Preview */}
        <div className="aspect-video bg-black rounded-lg mb-6 relative overflow-hidden border border-stone-800">
          {completedScenes[currentScene]?.videoUrl ? (
            <video
              ref={videoRef}
              src={completedScenes[currentScene].videoUrl}
              className="w-full h-full object-contain"
              onEnded={handleVideoEnded}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <Play className="w-16 h-16 text-stone-700 mx-auto mb-4" />
                <p className="text-stone-500">Preview will appear here after compilation</p>
              </div>
            </div>
          )}

          {/* Play overlay */}
          {completedScenes.length > 0 && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end justify-center pb-6">
              <button
                onClick={handlePlay}
                className="w-12 h-12 bg-emerald-600 hover:bg-emerald-500 rounded-full flex items-center justify-center text-white transition-colors"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
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
                onClick={() => setCurrentScene(idx)}
                className={`h-8 rounded flex-shrink-0 flex items-center justify-center text-xs font-medium cursor-pointer transition-all ${
                  idx === currentScene
                    ? "bg-emerald-600 text-white w-24"
                    : "bg-stone-800 text-stone-400 w-20 hover:bg-stone-700"
                }`}
              >
                {scene.duration}s
              </div>
            ))}
            {completedScenes.length === 0 && (
              <p className="text-stone-600 text-xs italic px-2">No rendered clips available</p>
            )}
          </div>
        </div>

        {/* Export */}
        <div className="flex items-center justify-between pt-4 border-t border-stone-800">
          <div className="flex items-center gap-2 text-sm text-stone-400">
            <Settings className="w-4 h-4" />
            <span>Export: 1080p · MP4 · H.264</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCompile}
              disabled={completedScenes.length === 0}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-800 disabled:text-stone-600 text-white font-medium px-6 py-3 rounded-lg flex items-center gap-2 transition-all"
            >
              <Film className="w-4 h-4" />
              Compile Final Cut
            </button>
            {finalVideoUrl && (
              <button
                onClick={() => window.open(finalVideoUrl, "_blank")}
                className="px-5 py-3 bg-stone-800 hover:bg-stone-700 text-white rounded-lg flex items-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
