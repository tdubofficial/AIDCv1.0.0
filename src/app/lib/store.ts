import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Character,
  StoryboardScene,
  ProjectTheme,
  VisualPreset,
  MusicVideoSettings,
  AudioTrack,
  VideoJob,
} from "~/app/types";

interface AppState {
  // API Keys
  apiKeys: { gemini: string; fal: string };
  setApiKey: (provider: "gemini" | "fal", key: string) => void;

  // Cast
  characters: Character[];
  addCharacter: (char: Character) => void;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  removeCharacter: (id: string) => void;

  // Theme
  theme: ProjectTheme;
  setTheme: (theme: Partial<ProjectTheme>) => void;

  // Visual Preset
  visualPreset: VisualPreset;
  setVisualPreset: (preset: Partial<VisualPreset>) => void;

  // Storyboard
  scenes: StoryboardScene[];
  setScenes: (scenes: StoryboardScene[]) => void;
  updateScene: (id: string, updates: Partial<StoryboardScene>) => void;
  reorderScenes: (scenes: StoryboardScene[]) => void;

  // Music Video
  musicSettings: MusicVideoSettings;
  setMusicSettings: (settings: Partial<MusicVideoSettings>) => void;
  audioTrack: AudioTrack | null;
  setAudioTrack: (track: AudioTrack | null) => void;

  // Video Jobs
  videoJobs: VideoJob[];
  addVideoJob: (job: VideoJob) => void;
  updateVideoJob: (id: string, updates: Partial<VideoJob>) => void;

  // UI
  activeTab: "cast" | "theme" | "production" | "compile" | "council" | "anthologies" | "equipment";
  setActiveTab: (tab: "cast" | "theme" | "production" | "compile" | "council" | "anthologies" | "equipment") => void;
  selectedProvider: "kling" | "minimax" | "wan" | "auto";
  setSelectedProvider: (p: "kling" | "minimax" | "wan" | "auto") => void;

  // Final
  finalVideoUrl: string | null;
  setFinalVideoUrl: (url: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // API Keys
      apiKeys: { gemini: "", fal: "" },
      setApiKey: (provider, key) =>
        set((s) => ({ apiKeys: { ...s.apiKeys, [provider]: key } })),

      // Cast
      characters: [],
      addCharacter: (char) =>
        set((s) => ({ characters: [...s.characters, char] })),
      updateCharacter: (id, updates) =>
        set((s) => ({
          characters: s.characters.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),
      removeCharacter: (id) =>
        set((s) => ({
          characters: s.characters.filter((c) => c.id !== id),
        })),

      // Theme
      theme: { title: "", genre: "drama", synopsis: "", tone: "cinematic" },
      setTheme: (theme) =>
        set((s) => ({ theme: { ...s.theme, ...theme } })),

      // Visual Preset
      visualPreset: {
        style: "cinematic",
        lighting: "natural",
        camera: "medium",
        aspectRatio: "16:9",
      },
      setVisualPreset: (preset) =>
        set((s) => ({ visualPreset: { ...s.visualPreset, ...preset } })),

      // Storyboard
      scenes: [],
      setScenes: (scenes) => set({ scenes }),
      updateScene: (id, updates) =>
        set((s) => ({
          scenes: s.scenes.map((sc) =>
            sc.id === id ? { ...sc, ...updates } : sc
          ),
        })),
      reorderScenes: (scenes) =>
        set({
          scenes: scenes.map((sc, idx) => ({
            ...sc,
            sceneNumber: idx + 1,
            order: idx,
          })),
        }),

      // Music Video
      musicSettings: {
        isEnabled: false,
        clipDuration: 15,
        quality: "1080p",
        loopMode: "sequential",
        transitionType: "crossfade",
        transitionDuration: 0.5,
      },
      setMusicSettings: (settings) =>
        set((s) => ({
          musicSettings: { ...s.musicSettings, ...settings },
        })),
      audioTrack: null,
      setAudioTrack: (track) => set({ audioTrack: track }),

      // Video Jobs
      videoJobs: [],
      addVideoJob: (job) =>
        set((s) => ({ videoJobs: [...s.videoJobs, job] })),
      updateVideoJob: (id, updates) =>
        set((s) => ({
          videoJobs: s.videoJobs.map((j) =>
            j.id === id ? { ...j, ...updates } : j
          ),
        })),

      // UI
      activeTab: "cast",
      setActiveTab: (tab) => set({ activeTab: tab }),
      selectedProvider: "wan",
      setSelectedProvider: (p) => set({ selectedProvider: p }),

      // Final
      finalVideoUrl: null,
      setFinalVideoUrl: (url) => set({ finalVideoUrl: url }),
    }),
    {
      name: "ai-director-storage",
      // Avoid persisting large binary data (data URLs). Persist only audio metadata.
      partialize: (state) => ({
        apiKeys: state.apiKeys,
        characters: state.characters,
        theme: state.theme,
        visualPreset: state.visualPreset,
        scenes: state.scenes,
        audioTrack: state.audioTrack
          ? {
              id: state.audioTrack.id,
              filename: state.audioTrack.filename,
              duration: state.audioTrack.duration,
            }
          : null,
        musicSettings: state.musicSettings,
        selectedProvider: state.selectedProvider,
      }),
    }
  )
);
