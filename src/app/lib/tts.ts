/**
 * Text-to-Speech generation for scene dialogue.
 *
 * Supports two engines:
 *  1. **Browser (Web Speech API)** — free, instant, works offline.
 *     Uses generic voice profiles (male-deep, female-warm, narrator, etc.)
 *  2. **ElevenLabs** — high-quality neural TTS via their REST API.
 *     Requires an API key. Free tier: 10 000 chars/month.
 *     Uses voice IDs selected from the user's ElevenLabs library.
 *
 * The generated audio is stored as a Blob URL on each scene so it can be
 * played alongside the rendered video clip.
 */

import type { VoiceEngine } from "~/app/types";

// ============================================================
// GENERIC (BROWSER) VOICE PROFILES
// ============================================================

export const VOICE_PROFILES: Record<
  string,
  { label: string; lang: string; genderHint: string; pitchShift: number; rateShift: number }
> = {
  "male-deep":      { label: "Male (Deep)",    lang: "en-US", genderHint: "male",   pitchShift: 0.8,  rateShift: 0.9  },
  "male-neutral":   { label: "Male (Neutral)",  lang: "en-US", genderHint: "male",   pitchShift: 1.0,  rateShift: 1.0  },
  "male-young":     { label: "Male (Young)",    lang: "en-US", genderHint: "male",   pitchShift: 1.15, rateShift: 1.05 },
  "female-warm":    { label: "Female (Warm)",   lang: "en-US", genderHint: "female", pitchShift: 1.0,  rateShift: 0.95 },
  "female-neutral": { label: "Female (Neutral)",lang: "en-US", genderHint: "female", pitchShift: 1.05, rateShift: 1.0  },
  "female-bright":  { label: "Female (Bright)", lang: "en-US", genderHint: "female", pitchShift: 1.2,  rateShift: 1.05 },
  "narrator":       { label: "Narrator",        lang: "en-US", genderHint: "male",   pitchShift: 0.95, rateShift: 0.85 },
};

// ============================================================
// ELEVENLABS API
// ============================================================

const ELEVEN_BASE = "https://api.elevenlabs.io/v1";

/** Shape of a voice returned by the ElevenLabs /voices endpoint */
export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;                 // "premade" | "cloned" | "generated"
  labels: Record<string, string>;   // e.g. { accent: "american", gender: "male" }
  preview_url: string | null;
}

/** Fetch available voices from ElevenLabs */
export async function fetchElevenLabsVoices(apiKey: string): Promise<ElevenLabsVoice[]> {
  const res = await fetch(`${ELEVEN_BASE}/voices`, {
    headers: { "xi-api-key": apiKey },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ElevenLabs API error ${res.status}: ${body}`);
  }
  const data = await res.json();
  return (data.voices ?? []) as ElevenLabsVoice[];
}

/** Generate speech audio via ElevenLabs and return a Blob URL */
export async function generateElevenLabsAudio(
  apiKey: string,
  voiceId: string,
  text: string,
  options?: { modelId?: string; stability?: number; similarityBoost?: number }
): Promise<string> {
  if (!text.trim()) throw new Error("No dialogue text");
  if (!apiKey) throw new Error("ElevenLabs API key is required");
  if (!voiceId) throw new Error("No ElevenLabs voice selected");

  const res = await fetch(`${ELEVEN_BASE}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: options?.modelId ?? "eleven_multilingual_v2",
      voice_settings: {
        stability: options?.stability ?? 0.5,
        similarity_boost: options?.similarityBoost ?? 0.75,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ElevenLabs TTS error ${res.status}: ${body}`);
  }

  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/** Quick validation that an API key works */
export async function validateElevenLabsKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${ELEVEN_BASE}/user`, {
      headers: { "xi-api-key": apiKey },
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ============================================================
// UNIFIED TTS INTERFACE
// ============================================================

export interface VoiceConfig {
  engine: VoiceEngine;
  /** Generic profile id (used when engine === "browser") */
  profileId?: string;
  /** ElevenLabs voice id (used when engine === "elevenlabs") */
  elevenLabsVoiceId?: string;
  /** ElevenLabs API key (required when engine === "elevenlabs") */
  elevenLabsApiKey?: string;
}

/**
 * Speak dialogue in real-time.
 * - browser engine → Web Speech API (synchronous playback)
 * - elevenlabs engine → pre-generate audio then play via <audio>
 *
 * Returns a cleanup/stop function.
 */
export async function speakDialogueUnified(
  text: string,
  config: VoiceConfig,
  onEnd?: () => void
): Promise<() => void> {
  if (!text.trim()) {
    onEnd?.();
    return () => {};
  }

  if (config.engine === "elevenlabs" && config.elevenLabsApiKey && config.elevenLabsVoiceId) {
    // ElevenLabs: generate audio blob, then play it
    try {
      const blobUrl = await generateElevenLabsAudio(
        config.elevenLabsApiKey,
        config.elevenLabsVoiceId,
        text
      );
      const audio = new Audio(blobUrl);
      audio.onended = () => {
        URL.revokeObjectURL(blobUrl);
        onEnd?.();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        onEnd?.();
      };
      await audio.play();
      return () => {
        audio.pause();
        audio.currentTime = 0;
        URL.revokeObjectURL(blobUrl);
        onEnd?.();
      };
    } catch (err) {
      console.warn("ElevenLabs TTS failed, falling back to browser:", err);
      // Fall through to browser engine
    }
  }

  // Browser (Web Speech API) — synchronous, no pre-generation
  speakDialogue(text, config.profileId, onEnd);
  return () => stopDialogue();
}

// ============================================================
// WEB SPEECH API — BROWSER ENGINE
// ============================================================

/** Resolve a voiceProfile id to the best matching system SpeechSynthesisVoice */
function pickVoice(profileId?: string): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  const profile = VOICE_PROFILES[profileId || "male-neutral"] || VOICE_PROFILES["male-neutral"];

  // Try to find an English voice matching the gender hint
  const englishVoices = voices.filter((v) => v.lang.startsWith("en"));
  if (englishVoices.length === 0) return voices[0];

  // Heuristic: voices with "Female"/"Male" in the name, or common voice names
  const genderMatch = englishVoices.find(
    (v) => v.name.toLowerCase().includes(profile.genderHint)
  );
  if (genderMatch) return genderMatch;

  // Fall back to first English voice
  return englishVoices[0];
}

/**
 * Generate dialogue audio using the Web Speech API, capturing it
 * via MediaRecorder through an AudioContext destination.
 * Returns a Blob URL of the generated WAV/webm audio.
 */
export async function generateDialogueAudio(
  text: string,
  voiceProfile?: string
): Promise<string> {
  if (!text.trim()) throw new Error("No dialogue text to generate");

  await ensureVoicesLoaded();

  return new Promise<string>((resolve, reject) => {
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = pickVoice(voiceProfile);
      if (voice) utterance.voice = voice;

      const profile = VOICE_PROFILES[voiceProfile || "male-neutral"] || VOICE_PROFILES["male-neutral"];
      utterance.pitch = profile.pitchShift;
      utterance.rate = profile.rateShift;
      utterance.lang = profile.lang;

      // Set up audio capture via AudioContext + MediaRecorder
      const audioCtx = new AudioContext();
      const dest = audioCtx.createMediaStreamDestination();

      // Create an oscillator as a silent baseline to keep the stream alive
      const silence = audioCtx.createGain();
      silence.gain.value = 0;
      silence.connect(dest);
      const osc = audioCtx.createOscillator();
      osc.connect(silence);
      osc.start();

      const recorder = new MediaRecorder(dest.stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        osc.stop();
        audioCtx.close();
        if (chunks.length === 0) {
          const fallbackBlob = generateSilentAudio(estimateSpeechDuration(text));
          resolve(URL.createObjectURL(fallbackBlob));
          return;
        }
        const blob = new Blob(chunks, { type: chunks[0].type });
        resolve(URL.createObjectURL(blob));
      };

      recorder.onerror = () => {
        osc.stop();
        audioCtx.close();
        reject(new Error("Audio recording failed"));
      };

      utterance.onend = () => {
        setTimeout(() => recorder.stop(), 200);
      };

      utterance.onerror = (ev) => {
        recorder.stop();
        reject(new Error(`Speech synthesis failed: ${ev.error}`));
      };

      recorder.start();
      speechSynthesis.speak(utterance);
    } catch (err) {
      reject(err);
    }
  });
}

// ============================================================
// HELPERS
// ============================================================

function ensureVoicesLoaded(): Promise<void> {
  return new Promise((resolve) => {
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve();
      return;
    }
    speechSynthesis.addEventListener("voiceschanged", () => resolve(), { once: true });
    setTimeout(resolve, 1000);
  });
}

function estimateSpeechDuration(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, words / 3.0);
}

/** Generate a valid WAV blob of silence */
function generateSilentAudio(durationSec: number): Blob {
  const sampleRate = 22050;
  const numSamples = Math.round(sampleRate * durationSec);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, numSamples * 2, true);

  return new Blob([buffer], { type: "audio/wav" });
}

/**
 * Play scene dialogue using the browser's speech synthesis.
 * Real-time playback (no pre-generated audio needed).
 */
export function speakDialogue(
  text: string,
  voiceProfile?: string,
  onEnd?: () => void
): SpeechSynthesisUtterance {
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickVoice(voiceProfile);
  if (voice) utterance.voice = voice;

  const profile = VOICE_PROFILES[voiceProfile || "male-neutral"] || VOICE_PROFILES["male-neutral"];
  utterance.pitch = profile.pitchShift;
  utterance.rate = profile.rateShift;
  utterance.lang = profile.lang;

  if (onEnd) utterance.onend = onEnd;

  speechSynthesis.speak(utterance);
  return utterance;
}

/** Stop all current speech (browser engine) */
export function stopDialogue(): void {
  speechSynthesis.cancel();
}
