import { useState, useRef } from "react";
import { Music, Upload, Film } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "~/app/lib/store";

const CLIP_DURATIONS = [15, 30, 45, 60] as const;
const QUALITIES = [
  { value: "480p", label: "480p", desc: "Fastest, smallest file" },
  { value: "720p", label: "720p HD", desc: "Good balance" },
  { value: "1080p", label: "1080p Full HD", desc: "Best quality" },
] as const;

export function MusicVideoMode() {
  const { musicSettings, setMusicSettings, scenes, audioTrack, setAudioTrack } = useAppStore();
  const [waveform, setWaveform] = useState<number[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const audio = new Audio();
    const url = URL.createObjectURL(file);
    audio.src = url;

    audio.onloadedmetadata = () => {
      setAudioTrack({
        id: Date.now().toString(),
        filename: file.name,
        duration: audio.duration,
        url,
      });
      // Generate fake waveform for visualization
      setWaveform(Array.from({ length: 80 }, () => 0.1 + Math.random() * 0.9));
    };
  };

  const totalSceneDuration = scenes.reduce((acc, s) => acc + (s.duration || 5), 0);
  const loopsNeeded = audioTrack ? Math.ceil(audioTrack.duration / Math.max(totalSceneDuration, 1)) : 0;

  return (
    <div className="bg-gradient-to-br from-stone-900 to-stone-950 border border-stone-800 rounded-xl overflow-hidden">
      <div className="p-5 border-b border-stone-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${musicSettings.isEnabled ? "bg-purple-500/20 text-purple-400" : "bg-stone-800 text-stone-400"}`}>
            <Music className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-medium text-white">Music Video Mode</h3>
            <p className="text-xs text-stone-400">Sync video clips to audio track</p>
          </div>
        </div>
        <button
          onClick={() => setMusicSettings({ isEnabled: !musicSettings.isEnabled })}
          className={`relative w-12 h-6 rounded-full transition-colors ${musicSettings.isEnabled ? "bg-purple-600" : "bg-stone-700"}`}
        >
          <motion.div
            className="absolute top-0.5 w-5 h-5 bg-white rounded-full"
            animate={{ left: musicSettings.isEnabled ? "26px" : "2px" }}
          />
        </button>
      </div>

      <AnimatePresence>
        {musicSettings.isEnabled && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="p-5 space-y-5"
          >
            {/* Audio Upload */}
            <div>
              <label className="text-xs font-medium text-stone-300 mb-2 block">Audio Track</label>
              <input type="file" accept="audio/mp3,audio/wav,audio/mpeg" onChange={handleAudioUpload} className="hidden" id="audio-upload" />
              <label
                htmlFor="audio-upload"
                className="flex items-center justify-center gap-3 w-full h-20 border-2 border-dashed border-stone-700 rounded-lg hover:border-purple-500/50 hover:bg-stone-800/50 transition-all cursor-pointer"
              >
                {audioTrack ? (
                  <div className="text-center">
                    <p className="text-white text-sm font-medium">{audioTrack.filename}</p>
                    <p className="text-xs text-stone-400">
                      {Math.floor(audioTrack.duration / 60)}:{String(Math.floor(audioTrack.duration % 60)).padStart(2, "0")}
                    </p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-stone-400" />
                    <span className="text-stone-400 text-sm">Drop MP3 or WAV</span>
                  </>
                )}
              </label>
            </div>

            {/* Waveform */}
            {waveform.length > 0 && (
              <div className="h-12 bg-stone-950 rounded-lg flex items-end gap-px px-1 overflow-hidden">
                {waveform.map((h, i) => (
                  <div key={i} className="flex-1 bg-purple-500/40 rounded-t-sm" style={{ height: `${h * 100}%`, minWidth: 2 }} />
                ))}
              </div>
            )}

            {/* Clip Duration */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-stone-300">Clip Duration</label>
                {audioTrack && scenes.length > 0 && (
                  <span className="text-xs text-purple-400">Loops {loopsNeeded}x</span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {CLIP_DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setMusicSettings({ clipDuration: d })}
                    className={`py-2 rounded-lg border text-sm font-medium transition-all ${
                      musicSettings.clipDuration === d
                        ? "bg-purple-600 border-purple-500 text-white"
                        : "bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700"
                    }`}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>

            {/* Quality */}
            <div>
              <label className="text-xs font-medium text-stone-300 mb-2 block">Quality</label>
              <div className="grid grid-cols-3 gap-2">
                {QUALITIES.map((q) => (
                  <button
                    key={q.value}
                    onClick={() => setMusicSettings({ quality: q.value })}
                    className={`py-2.5 rounded-lg border text-left px-3 transition-all ${
                      musicSettings.quality === q.value
                        ? "bg-purple-600 border-purple-500 text-white"
                        : "bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700"
                    }`}
                  >
                    <div className="text-sm font-medium">{q.label}</div>
                    <div className="text-[10px] opacity-70">{q.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Loop Preview */}
            {audioTrack && scenes.length > 0 && (
              <div className="bg-stone-950 rounded-lg p-3 space-y-2">
                <h4 className="text-xs font-medium text-stone-300 flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5" /> Loop Preview
                </h4>
                {Array.from({ length: Math.min(loopsNeeded, 4) }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] text-stone-400">
                    <span className="text-purple-400 font-mono w-12">Loop {i + 1}</span>
                    <div className="flex-1 h-1.5 bg-stone-900 rounded-full overflow-hidden flex">
                      {scenes.map((s, j) => (
                        <div key={j} className="h-full bg-stone-700 border-r border-stone-900" style={{ width: `${((s.duration || 5) / totalSceneDuration) * 100}%` }} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
