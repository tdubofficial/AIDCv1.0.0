import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Camera, Users, Volume2, Key, Loader2, CheckCircle, XCircle, Play } from "lucide-react";
import { useAppStore } from "~/app/lib/store";
import { VOICE_PROFILES, fetchElevenLabsVoices, validateElevenLabsKey, speakDialogue, stopDialogue, type ElevenLabsVoice } from "~/app/lib/tts";
import type { Character, VoiceEngine } from "~/app/types";

export function CastManager({ guided }: { guided?: boolean }) {
  const { characters, addCharacter, updateCharacter, removeCharacter, apiKeys, setApiKey } = useAppStore();

  // ElevenLabs state
  const [elVoices, setElVoices] = useState<ElevenLabsVoice[]>([]);
  const [elLoading, setElLoading] = useState(false);
  const [elError, setElError] = useState<string | null>(null);
  const [elKeyValid, setElKeyValid] = useState<boolean | null>(null);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);

  // Load ElevenLabs voices when API key is set
  const loadElevenLabsVoices = useCallback(async (key: string) => {
    if (!key) { setElVoices([]); setElKeyValid(null); return; }
    setElLoading(true);
    setElError(null);
    try {
      const valid = await validateElevenLabsKey(key);
      setElKeyValid(valid);
      if (!valid) {
        setElError("Invalid API key");
        setElVoices([]);
        return;
      }
      const voices = await fetchElevenLabsVoices(key);
      setElVoices(voices);
    } catch (err: any) {
      setElError(err.message || "Failed to load voices");
      setElVoices([]);
    } finally {
      setElLoading(false);
    }
  }, []);

  // Auto-load voices if key exists on mount
  useEffect(() => {
    if (apiKeys.elevenlabs) loadElevenLabsVoices(apiKeys.elevenlabs);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = () => {
    const newChar: Character = {
      id: Date.now().toString(),
      name: "New Character",
      description: "",
      photoUrl: null,
      voiceEngine: "browser",
    };
    addCharacter(newChar);
  };

  const handlePhotoUpload = (charId: string, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      updateCharacter(charId, { photoUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handlePreviewVoice = (voiceUrl: string | null, voiceId: string) => {
    // Stop any existing preview
    if (previewAudio) { previewAudio.pause(); setPreviewAudio(null); }
    stopDialogue();

    if (previewingVoice === voiceId) {
      setPreviewingVoice(null);
      return;
    }

    if (voiceUrl) {
      const audio = new Audio(voiceUrl);
      audio.onended = () => { setPreviewingVoice(null); setPreviewAudio(null); };
      audio.play().catch(() => {});
      setPreviewAudio(audio);
      setPreviewingVoice(voiceId);
    }
  };

  const handlePreviewGeneric = (profileId: string) => {
    if (previewAudio) { previewAudio.pause(); setPreviewAudio(null); }
    stopDialogue();

    if (previewingVoice === profileId) {
      setPreviewingVoice(null);
      return;
    }

    setPreviewingVoice(profileId);
    speakDialogue("Hello, I'm ready for my scene.", profileId, () => setPreviewingVoice(null));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold text-white mb-1">Ready to Cast</h2>
          <p className="text-stone-400 text-sm">Define your characters, upload reference photos, and assign voices.</p>
          {guided && characters.length === 0 && (
            <div className="mt-2 text-emerald-400 text-xs font-semibold">Add your first character to begin your production journey.</div>
          )}
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg font-medium transition-colors animate-bounce"
        >
          <Plus className="w-4 h-4" />
          Add Character
        </button>
      </div>

      {/* ElevenLabs API Key Section */}
      <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-stone-300 text-sm font-medium">
          <Key className="w-4 h-4 text-violet-400" />
          ElevenLabs (Premium Voices)
          <span className="text-stone-500 text-xs font-normal">— optional, 10k chars/month free tier</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="password"
            value={apiKeys.elevenlabs}
            onChange={(e) => setApiKey("elevenlabs", e.target.value)}
            placeholder="sk_... (ElevenLabs API key)"
            className="flex-1 bg-stone-950 text-stone-300 text-sm border border-stone-800 rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500/50 font-mono"
          />
          <button
            onClick={() => loadElevenLabsVoices(apiKeys.elevenlabs)}
            disabled={!apiKeys.elevenlabs || elLoading}
            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:hover:bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {elLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />}
            {elLoading ? "Loading..." : "Load Voices"}
          </button>
        </div>
        {elKeyValid === true && (
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
            <CheckCircle className="w-3.5 h-3.5" />
            Connected — {elVoices.length} voices available
          </div>
        )}
        {elKeyValid === false && (
          <div className="flex items-center gap-1.5 text-red-400 text-xs">
            <XCircle className="w-3.5 h-3.5" />
            {elError || "Invalid API key"}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {characters.map((char) => (
          <CharacterCard
            key={char.id}
            char={char}
            onUpdate={(updates) => updateCharacter(char.id, updates)}
            onRemove={() => removeCharacter(char.id)}
            onPhotoUpload={(file) => handlePhotoUpload(char.id, file)}
            elVoices={elVoices}
            elAvailable={elKeyValid === true}
            previewingVoice={previewingVoice}
            onPreviewGeneric={handlePreviewGeneric}
            onPreviewEL={handlePreviewVoice}
          />
        ))}

        {characters.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-stone-800 rounded-xl">
            <Users className="w-12 h-12 text-stone-700 mx-auto mb-4" />
            <p className="text-stone-500">No cast members yet. Add characters to begin production.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// CHARACTER CARD — with dual voice engine support
// ============================================================

function CharacterCard({
  char, onUpdate, onRemove, onPhotoUpload, elVoices, elAvailable, previewingVoice, onPreviewGeneric, onPreviewEL,
}: {
  char: Character;
  onUpdate: (updates: Partial<Character>) => void;
  onRemove: () => void;
  onPhotoUpload: (file: File) => void;
  elVoices: ElevenLabsVoice[];
  elAvailable: boolean;
  previewingVoice: string | null;
  onPreviewGeneric: (profileId: string) => void;
  onPreviewEL: (previewUrl: string | null, voiceId: string) => void;
}) {
  const engine: VoiceEngine = char.voiceEngine || "browser";

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden hover:border-stone-700 transition-colors group">
      {/* Photo Area */}
      <div className="aspect-video bg-stone-950 relative overflow-hidden">
        {char.photoUrl ? (
          <img src={char.photoUrl} alt={char.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-stone-900">
            <Users className="w-14 h-14 text-stone-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <label className="cursor-pointer bg-emerald-600 text-white px-4 py-2 rounded-full flex items-center gap-2 hover:bg-emerald-500 transition-colors text-sm">
            <Camera className="w-4 h-4" />
            Upload Photo
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && onPhotoUpload(e.target.files[0])}
            />
          </label>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-3">
        <input
          type="text"
          value={char.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="w-full bg-transparent text-white font-serif text-lg font-semibold border-none focus:outline-none focus:ring-1 focus:ring-emerald-500/50 rounded px-1 -ml-1"
          placeholder="Character Name"
        />
        <textarea
          value={char.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          className="w-full bg-stone-950 text-stone-400 text-sm border border-stone-800 rounded-lg p-2.5 focus:outline-none focus:border-emerald-500/50 resize-none h-20"
          placeholder="Physical description, personality, wardrobe details..."
        />

        {/* ============ Voice Section ============ */}
        <div className="space-y-2 bg-stone-950/50 border border-stone-800/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-xs text-stone-400 font-medium">
            <Volume2 className="w-3.5 h-3.5" />
            Voice
          </div>

          {/* Engine toggle */}
          <div className="flex rounded-lg overflow-hidden border border-stone-800 text-xs">
            <button
              onClick={() => onUpdate({ voiceEngine: "browser" })}
              className={`flex-1 py-1.5 px-2 text-center transition-colors ${
                engine === "browser"
                  ? "bg-emerald-600/20 text-emerald-400 font-medium"
                  : "bg-stone-900 text-stone-500 hover:text-stone-300"
              }`}
            >
              Generic
            </button>
            <button
              onClick={() => {
                if (elAvailable) onUpdate({ voiceEngine: "elevenlabs" });
              }}
              disabled={!elAvailable}
              className={`flex-1 py-1.5 px-2 text-center transition-colors ${
                engine === "elevenlabs"
                  ? "bg-violet-600/20 text-violet-400 font-medium"
                  : elAvailable
                  ? "bg-stone-900 text-stone-500 hover:text-stone-300"
                  : "bg-stone-900 text-stone-600 cursor-not-allowed"
              }`}
              title={elAvailable ? "Use ElevenLabs voice" : "Add ElevenLabs API key above to unlock"}
            >
              ElevenLabs
            </button>
          </div>

          {/* Generic voice selector */}
          {engine === "browser" && (
            <div className="space-y-1.5">
              <select
                value={char.voiceProfile || ""}
                onChange={(e) => onUpdate({ voiceProfile: e.target.value || undefined })}
                className="w-full bg-stone-950 text-stone-300 text-xs border border-stone-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
              >
                <option value="">No voice assigned</option>
                {Object.entries(VOICE_PROFILES).map(([key, profile]) => (
                  <option key={key} value={key}>{profile.label}</option>
                ))}
              </select>
              {char.voiceProfile && (
                <button
                  onClick={() => onPreviewGeneric(char.voiceProfile!)}
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                    previewingVoice === char.voiceProfile
                      ? "bg-emerald-600/20 text-emerald-400"
                      : "bg-stone-800 text-stone-400 hover:text-white hover:bg-stone-700"
                  }`}
                >
                  <Play className="w-3 h-3" />
                  {previewingVoice === char.voiceProfile ? "Playing..." : "Preview"}
                </button>
              )}
            </div>
          )}

          {/* ElevenLabs voice selector */}
          {engine === "elevenlabs" && (
            <div className="space-y-1.5">
              <select
                value={char.elevenLabsVoiceId || ""}
                onChange={(e) => {
                  const voice = elVoices.find((v) => v.voice_id === e.target.value);
                  onUpdate({
                    elevenLabsVoiceId: e.target.value || undefined,
                    elevenLabsVoiceName: voice?.name || undefined,
                  });
                }}
                className="w-full bg-stone-950 text-stone-300 text-xs border border-stone-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-violet-500/50 cursor-pointer"
              >
                <option value="">Select a voice...</option>
                {elVoices.map((v) => (
                  <option key={v.voice_id} value={v.voice_id}>
                    {v.name} ({v.category}{v.labels?.gender ? `, ${v.labels.gender}` : ""})
                  </option>
                ))}
              </select>
              {char.elevenLabsVoiceId && (
                <div className="flex items-center gap-2">
                  {(() => {
                    const voice = elVoices.find((v) => v.voice_id === char.elevenLabsVoiceId);
                    return voice?.preview_url ? (
                      <button
                        onClick={() => onPreviewEL(voice.preview_url, voice.voice_id)}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                          previewingVoice === voice.voice_id
                            ? "bg-violet-600/20 text-violet-400"
                            : "bg-stone-800 text-stone-400 hover:text-white hover:bg-stone-700"
                        }`}
                      >
                        <Play className="w-3 h-3" />
                        {previewingVoice === voice.voice_id ? "Playing..." : "Preview"}
                      </button>
                    ) : null;
                  })()}
                  <span className="text-[10px] text-stone-600">
                    {char.elevenLabsVoiceName || char.elevenLabsVoiceId}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={onRemove}
            className="text-stone-600 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
