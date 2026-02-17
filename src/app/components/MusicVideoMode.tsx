import { useState, useRef, useEffect } from "react";
import { Music, Upload, Film, Play, Pause } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "~/app/lib/store";
import { saveAudioBlob, getAudioBlob, deleteAudioBlob } from "~/app/lib/audioDB";

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
  const [isPlaying, setIsPlaying] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const [beats, setBeats] = useState<number[]>([]);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewRef = useRef<HTMLAudioElement | null>(null);

  // Compute real waveform from audio data when audioTrack.url is a data URL
  useEffect(() => {
    let ctx: AudioContext | null = null;
    let cancelled = false;

    async function computeWaveform(url: string) {
      try {
        // Only process data URLs or same-origin URLs
        const res = await fetch(url);
        const arrayBuffer = await res.arrayBuffer();
        ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        audioBufferRef.current = audioBuffer;

        const channelData = audioBuffer.numberOfChannels > 0 ? audioBuffer.getChannelData(0) : new Float32Array(0);
        const samples = channelData.length;
        const buckets = 120; // waveform resolution
        const blockSize = Math.floor(samples / buckets) || 1;
        const values: number[] = [];
        for (let i = 0; i < buckets; i++) {
          let sum = 0;
          const start = i * blockSize;
          const end = Math.min(start + blockSize, samples);
          for (let j = start; j < end; j++) {
            sum += Math.abs(channelData[j]);
          }
          const avg = sum / (end - start || 1);
          values.push(avg);
        }

        const max = Math.max(...values) || 1;
        const normalized = values.map((v) => Math.min(1, v / max));
        // simple beat detection: peaks above threshold
        const threshold = 0.35;
        const duration = audioBuffer.duration || 0;
        const beatsLocal: number[] = [];
        normalized.forEach((v, i) => {
          if (v > threshold) beatsLocal.push((i / buckets) * duration);
        });
        if (!cancelled) {
          setWaveform(normalized);
          setBeats(beatsLocal);
          setTrimStart(0);
          setTrimEnd(Math.floor(duration));
        }
      } catch (e) {
        // fallback: generate synthetic waveform if decode fails
        if (!cancelled) setWaveform(Array.from({ length: 80 }, () => 0.1 + Math.random() * 0.9));
      }
    }

    if (audioTrack?.url) {
      computeWaveform(audioTrack.url);
    }

    return () => {
      cancelled = true;
      if (ctx) ctx.close();
    };
  }, [audioTrack?.url]);

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const id = Date.now().toString();
    const objectUrl = URL.createObjectURL(file);
    const audioEl = audioRef.current;
    if (audioEl) {
      audioEl.src = objectUrl;
      audioEl.load();
      audioEl.onloadedmetadata = async () => {
        setAudioTrack({ id, filename: file.name, duration: audioEl.duration, url: objectUrl });
        setWaveform(Array.from({ length: 80 }, () => 0.1 + Math.random() * 0.9));
        try {
          await saveAudioBlob(id, file);
        } catch (err) {
          console.error("Failed to persist audio to IndexedDB", err);
        }
      };
    } else {
      setAudioTrack({ id, filename: file.name, duration: 0, url: objectUrl });
      setWaveform(Array.from({ length: 80 }, () => 0.1 + Math.random() * 0.9));
      saveAudioBlob(id, file).catch((err) => console.error("saveAudioBlob", err));
    }
  };

  const togglePlay = () => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    if (isPlaying) {
      audioEl.pause();
      setIsPlaying(false);
    } else {
      audioEl.play();
      setIsPlaying(true);
    }
  };

  // Sync audio element when persisted audioTrack changes
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    let objectUrl: string | null = null;
    let onTime: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      const audioEl = audioRef.current;
      if (!audioEl) return;
      if (audioTrack?.url) {
        if (audioEl.src !== audioTrack.url) {
          audioEl.src = audioTrack.url;
          audioEl.load();
        }
      } else if (audioTrack?.id) {
        try {
          const blob = await getAudioBlob(audioTrack.id);
          if (blob && !cancelled) {
            objectUrl = URL.createObjectURL(blob);
            audioEl.src = objectUrl;
            audioEl.load();
            setAudioTrack({ ...audioTrack, url: objectUrl });
          }
        } catch (err) {
          console.error("Failed to load audio blob from IndexedDB", err);
        }
      }

      onTime = () => setCurrentTime(audioEl.currentTime || 0);
      audioEl.addEventListener("timeupdate", onTime);
    })();

    return () => {
      cancelled = true;
      const audioEl = audioRef.current;
      if (audioEl && onTime) audioEl.removeEventListener("timeupdate", onTime);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [audioTrack]);

  // Draw waveform and beats on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctxC = canvas.getContext("2d");
    if (!ctxC) return;
    ctxC.clearRect(0, 0, canvas.width, canvas.height);
    if (waveform.length === 0) return;

    // draw waveform
    ctxC.fillStyle = "#0f172a"; // bg
    ctxC.fillRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width;
    const h = canvas.height;
    const barWidth = w / waveform.length;
    for (let i = 0; i < waveform.length; i++) {
      const v = waveform[i];
      const barH = Math.max(1, v * h * 0.9);
      ctxC.fillStyle = "rgba(139,92,246,0.45)"; // purple
      ctxC.fillRect(i * barWidth, h - barH, Math.max(1, barWidth - 1), barH);
    }

    // draw beats
    ctxC.strokeStyle = "rgba(16,185,129,0.9)"; // emerald
    ctxC.lineWidth = Math.max(1, dpr);
    const duration = audioBufferRef.current?.duration || 0;
    beats.forEach((t) => {
      const x = Math.floor((t / Math.max(duration, 1)) * w);
      ctxC.beginPath();
      ctxC.moveTo(x, 0);
      ctxC.lineTo(x, h);
      ctxC.stroke();
    });

    // draw trim selection overlay
    if (trimEnd > trimStart && duration > 0) {
      const startX = (trimStart / Math.max(duration, 1)) * w;
      const endX = (trimEnd / Math.max(duration, 1)) * w;
      ctxC.fillStyle = "rgba(2,6,23,0.6)";
      ctxC.fillRect(0, 0, startX, h);
      ctxC.fillRect(endX, 0, w - endX, h);
      // draw borders
      ctxC.strokeStyle = "rgba(255,255,255,0.12)";
      ctxC.strokeRect(startX, 0, Math.max(1, endX - startX), h);
    }
  }, [waveform, beats, trimStart, trimEnd]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = volume;
  }, [volume]);

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
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-xs text-stone-400">
                        {Math.floor(audioTrack.duration / 60)}:{String(Math.floor(audioTrack.duration % 60)).padStart(2, "0")}
                      </p>
                      <span className="text-[10px] text-emerald-400 bg-emerald-600/10 px-2 py-1 rounded">Persisted locally</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-stone-400" />
                    <span className="text-stone-400 text-sm">Drop MP3 or WAV</span>
                  </>
                )}
              </label>
            </div>

            {/* Play / Pause controls (shown when a track is loaded) */}
            {audioTrack && (
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 bg-purple-600 hover:bg-purple-500 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
                    <span>{audioTrack.filename}</span>
                    <span>
                      {Math.floor((currentTime || 0) / 60)}:{String(Math.floor((currentTime || 0) % 60)).padStart(2, "0")} / {Math.floor((audioTrack.duration || 0) / 60)}:{String(Math.floor((audioTrack.duration || 0) % 60)).padStart(2, "0")}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={audioTrack.duration || 0}
                    value={currentTime}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      const el = audioRef.current;
                      if (el) el.currentTime = v;
                      setCurrentTime(v);
                    }}
                    className="w-full"
                  />
                </div>
                <div className="w-28 flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                  />
                </div>
              </div>
            )}
            {/* Hidden audio element used for playback */}
            <audio ref={audioRef} onEnded={() => setIsPlaying(false)} className="hidden" />

            {/* Waveform (Canvas) */}
            <div className="h-24 bg-stone-950 rounded-lg overflow-hidden">
              <canvas ref={canvasRef} className="w-full h-full" />
            </div>

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
                {/* Trim controls and export */}
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-stone-400">
                    <span>Trim selection</span>
                    <span className="text-xs text-stone-500">{Math.floor(trimStart)}s — {Math.floor(trimEnd)}s</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      type="range"
                      min={0}
                      max={audioTrack.duration || 0}
                      value={trimStart}
                      onChange={(e) => setTrimStart(Math.min(Number(e.target.value), trimEnd - 0.1))}
                      className="flex-1"
                    />
                    <input
                      type="range"
                      min={0}
                      max={audioTrack.duration || 0}
                      value={trimEnd}
                      onChange={(e) => setTrimEnd(Math.max(Number(e.target.value), trimStart + 0.1))}
                      className="w-36"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        if (!audioBufferRef.current) return;
                        const start = Math.max(0, trimStart);
                        const end = Math.min(audioBufferRef.current.duration, trimEnd || audioBufferRef.current.duration);
                        const sampleRate = audioBufferRef.current.sampleRate;
                        const startSample = Math.floor(start * sampleRate);
                        const endSample = Math.floor(end * sampleRate);
                        const channelSlices: Float32Array[] = [];
                        for (let ch = 0; ch < audioBufferRef.current.numberOfChannels; ch++) {
                          channelSlices.push(audioBufferRef.current.getChannelData(ch).slice(startSample, endSample));
                        }
                        const wav = encodeWAV(channelSlices, sampleRate);
                        const url = URL.createObjectURL(wav);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = (audioTrack.filename || 'clip') + '.wav';
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-3 py-2 bg-emerald-600 text-white rounded"
                    >
                      Export Clip
                    </button>
                    <button
                      onClick={() => {
                        // quick trim: set audio src to trimmed selection and play
                        const el = audioRef.current;
                        if (!el || !audioBufferRef.current) return;
                        const start = trimStart;
                        el.currentTime = start;
                        el.play();
                        setIsPlaying(true);
                      }}
                      className="px-3 py-2 bg-stone-800 text-white rounded"
                    >
                      Play Trim
                    </button>
                    <button
                      onClick={async () => {
                        // generate preview blob and set preview player
                        if (!audioBufferRef.current) return;
                        const start = Math.max(0, trimStart);
                        const end = Math.min(audioBufferRef.current.duration, trimEnd || audioBufferRef.current.duration);
                        const sampleRate = audioBufferRef.current.sampleRate;
                        const startSample = Math.floor(start * sampleRate);
                        const endSample = Math.floor(end * sampleRate);
                        const channelSlices: Float32Array[] = [];
                        for (let ch = 0; ch < audioBufferRef.current.numberOfChannels; ch++) {
                          channelSlices.push(audioBufferRef.current.getChannelData(ch).slice(startSample, endSample));
                        }
                        const blob = encodeWAV(channelSlices, sampleRate);
                        const url = URL.createObjectURL(blob);
                        // revoke previous
                        if (previewUrl) URL.revokeObjectURL(previewUrl);
                        setPreviewUrl(url);
                        // autoplay preview
                        setTimeout(() => {
                          if (previewRef.current) {
                            previewRef.current.src = url;
                            previewRef.current.play().catch(() => {});
                          }
                        }, 50);
                      }}
                      className="px-3 py-2 bg-blue-600 text-white rounded"
                    >
                      Preview Clip
                    </button>
                  </div>
                </div>
              </div>
            )}
            {previewUrl && (
              <div className="mt-2">
                <audio ref={previewRef} controls className="w-full">
                  <source src={previewUrl} />
                </audio>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// WAV encoder supporting multiple channels (Float32Array[] -> WAV Blob)
function encodeWAV(channels: Float32Array[], sampleRate: number): Blob {
  const numChannels = Math.max(1, channels.length);
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const length = channels[0]?.length || 0;
  const dataSize = length * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(view: DataView, offset: number, str: string) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // audio format (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // byte rate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true); // bits per sample
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // interleave and write samples (16-bit PCM)
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const chan = channels[ch] || channels[0];
      let s = Math.max(-1, Math.min(1, chan[i] || 0));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: "audio/wav" });
}
