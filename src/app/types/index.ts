export interface Character {
  id: string;
  name: string;
  description: string;
  photoUrl: string | null;
  voiceProfile?: string;
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

export type ProviderType = "kling" | "minimax" | "wan" | "auto";

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
