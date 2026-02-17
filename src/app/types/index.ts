export type VoiceEngine = "browser" | "elevenlabs";

export interface Character {
  id: string;
  name: string;
  description: string;
  photoUrl: string | null;
  /** Which TTS engine to use: browser (Web Speech API) or elevenlabs */
  voiceEngine?: VoiceEngine;
  /** Generic voice profile id (male-deep, female-warm, narrator, etc.) */
  voiceProfile?: string;
  /** ElevenLabs voice id (when voiceEngine === "elevenlabs") */
  elevenLabsVoiceId?: string;
  /** Display name of the selected ElevenLabs voice */
  elevenLabsVoiceName?: string;
}

export interface StoryboardScene {
  id: string;
  sceneNumber: number;
  title: string;
  description: string;
  cameraAngle: string;
  characters: string[];
  dialog: string;
  lighting: string;
  duration: number;
  status: "pending" | "generating" | "completed" | "error";
  videoUrl?: string;
  prompt: string;
  order: number;
  /** Council-enhanced prompt after voting */
  councilPrompt?: string;
  /** Which council approach was selected */
  selectedApproach?: string;
  /** Job start timestamp for ETA tracking */
  jobStart?: number;
  /** Provider used for this scene */
  provider?: string;
  /** Generated TTS audio URL for dialogue */
  dialogAudioUrl?: string;
  /** TTS generation status */
  dialogAudioStatus?: "pending" | "generating" | "completed" | "error";
  /** Per-scene reference image for img2vid (feature #4) */
  referenceImageUrl?: string;
  /** Prompt history for versioning (feature #5) */
  promptHistory?: string[];
  /** Previous render URL for side-by-side compare (feature #6) */
  previousVideoUrl?: string;
  /** Thumbnail preview URL (feature #11) */
  thumbnailUrl?: string;
}

export interface ProjectTheme {
  title: string;
  genre: string;
  synopsis: string;
  tone: string;
}

export interface VisualPreset {
  style: string;
  lighting: string;
  camera: string;
  aspectRatio: string;
}

export interface MusicVideoSettings {
  isEnabled: boolean;
  clipDuration: number;
  quality: string;
  loopMode: "sequential" | "random" | "beat-synced";
  transitionType: "cut" | "crossfade" | "fade";
  transitionDuration: number;
}

export interface AudioTrack {
  id: string;
  filename: string;
  duration: number;
  url: string;
  waveformData?: number[];
}

export interface VideoJob {
  id: string;
  sceneId: string;
  provider: string;
  status: "pending" | "generating" | "completed" | "failed";
  externalId?: string;
  videoUrl?: string;
  error?: string;
  cost?: number;
}

export type ProviderType = "kling" | "kling-o1" | "minimax" | "wan" | "omni-human" | "veo2" | "ltx" | "pixverse" | "runway" | "auto";

export interface VideoGenerationParams {
  prompt: string;
  negativePrompt?: string;
  imageUrl?: string;
  duration: number;
  aspectRatio: "16:9" | "9:16" | "1:1";
  seed?: number;
  cameraMovement?: string;
  characterReference?: string;
  stylePreset?: string;
  webhookUrl?: string;
  characterIds?: number[];
}

// ============================================================
// COUNCIL VOTING TYPES
// ============================================================

/** A single expert's vote/recommendation for a scene */
export interface CouncilVote {
  expertId: string;
  expertName: string;
  specialty: string;
  recommendation: string;
  promptSuggestion: string;
  confidence: number; // 0-100
}

/** All votes for a specific scene */
export interface SceneCouncilVotes {
  sceneId: string;
  votes: CouncilVote[];
  selectedVoteIdx: number | null; // which vote the user picked
  mergedPrompt?: string; // merged prompt from multiple experts (feature #7)
  status: "pending" | "voting" | "voted" | "decided";
}

// ============================================================
// ANTHOLOGY SELECTION TYPES
// ============================================================

/** User's global anthology preset selections */
export interface AnthologySelections {
  directorStyle: string | null;   // director id from DIRECTORS
  colorGrade: string | null;      // grading id from GRADING
  /** Prompt hints aggregated from selections */
  promptHints: string[];
}

// ============================================================
// EQUIPMENT SELECTION TYPES
// ============================================================

/** User's selected camera + lens + lighting setup */
export interface EquipmentSelections {
  cameraId: string | null;
  lensId: string | null;
  lightingStyleId: string | null;
  /** Prompt hints aggregated from selections */
  promptHints: string[];
}

// ============================================================
// UI PREFERENCES (feature #14)
// ============================================================

export interface UIPreferences {
  defaultProvider: ProviderType;
  defaultAspectRatio: string;
  dialogueEnabledByDefault: boolean;
  guidedMode: boolean;
}

// ============================================================
// PROJECT EXPORT (feature #10)
// ============================================================

export interface ProjectExport {
  version: string;
  exportDate: string;
  theme: ProjectTheme;
  characters: Character[];
  scenes: StoryboardScene[];
  visualPreset: VisualPreset;
  councilVotes: SceneCouncilVotes[];
  anthologySelections: AnthologySelections;
  equipmentSelections: EquipmentSelections;
  musicSettings: MusicVideoSettings;
  selectedProvider: ProviderType;
  uiPreferences: UIPreferences;
}

// ============================================================
// COST TRACKING (feature #13)
// ============================================================

export interface CostEntry {
  sceneId: string;
  provider: string;
  estimatedCost: number;
  timestamp: number;
}

// ============================================================
// RENDER TIMING HISTORY (adaptive estimation)
// ============================================================

export interface RenderTimingRecord {
  /** Which provider was used */
  provider: string;
  /** Requested output duration in seconds */
  outputDuration: number;
  /** Actual wall-clock seconds from job start to completion */
  actualSeconds: number;
  /** Whether a reference/input image was provided */
  hadImage: boolean;
  /** Length of the prompt (chars) — proxy for complexity */
  promptLength: number;
  /** Aspect ratio used */
  aspectRatio: string;
  /** Timestamp of the completed render */
  timestamp: number;
}
