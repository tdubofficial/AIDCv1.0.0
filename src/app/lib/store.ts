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
  SceneCouncilVotes,
  AnthologySelections,
  EquipmentSelections,
  UIPreferences,
  CostEntry,
  RenderTimingRecord,
  ProjectExport,
} from "~/app/types";

type TabId = "cast" | "theme" | "council" | "anthologies" | "equipment" | "production" | "compile";

interface AppState {
  // API Keys
  apiKeys: { gemini: string; fal: string; elevenlabs: string };
  setApiKey: (provider: "gemini" | "fal" | "elevenlabs", key: string) => void;

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

  // Council Voting
  councilVotes: SceneCouncilVotes[];
  setCouncilVotes: (votes: SceneCouncilVotes[]) => void;
  updateCouncilVote: (sceneId: string, updates: Partial<SceneCouncilVotes>) => void;

  // Anthology Selections (global creative direction)
  anthologySelections: AnthologySelections;
  setAnthologySelections: (sel: Partial<AnthologySelections>) => void;

  // Equipment Selections (camera/lens/lighting)
  equipmentSelections: EquipmentSelections;
  setEquipmentSelections: (sel: Partial<EquipmentSelections>) => void;

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
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  selectedProvider: "kling" | "kling-o1" | "minimax" | "wan" | "omni-human" | "veo2" | "ltx" | "pixverse" | "runway" | "auto";
  setSelectedProvider: (p: "kling" | "kling-o1" | "minimax" | "wan" | "omni-human" | "veo2" | "ltx" | "pixverse" | "runway" | "auto") => void;

  // UI Preferences (feature #14)
  uiPreferences: UIPreferences;
  setUIPreferences: (prefs: Partial<UIPreferences>) => void;

  // Cost Tracking (feature #13)
  costLog: CostEntry[];
  addCostEntry: (entry: CostEntry) => void;
  clearCostLog: () => void;

  // Render Timing History (adaptive estimation)
  renderTimings: RenderTimingRecord[];
  addRenderTiming: (record: RenderTimingRecord) => void;
  clearRenderTimings: () => void;

  // Final
  finalVideoUrl: string | null;
  setFinalVideoUrl: (url: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // API Keys
      apiKeys: { gemini: "", fal: "", elevenlabs: "" },
      setApiKey: (provider, key) =>
        set((s) => ({ apiKeys: { ...s.apiKeys, [provider]: key } })),

      // Cast
      characters: [] as Character[],
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
      scenes: [] as StoryboardScene[],
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

      // Council Voting
      councilVotes: [] as SceneCouncilVotes[],
      setCouncilVotes: (votes) => set({ councilVotes: votes }),
      updateCouncilVote: (sceneId, updates) =>
        set((s) => ({
          councilVotes: s.councilVotes.map((cv) =>
            cv.sceneId === sceneId ? { ...cv, ...updates } : cv
          ),
        })),

      // Anthology Selections
      anthologySelections: {
        directorStyle: null as string | null,
        colorGrade: null as string | null,
        promptHints: [] as string[],
      },
      setAnthologySelections: (sel) =>
        set((s) => ({
          anthologySelections: { ...s.anthologySelections, ...sel },
        })),

      // Equipment Selections
      equipmentSelections: {
        cameraId: null as string | null,
        lensId: null as string | null,
        lightingStyleId: null as string | null,
        promptHints: [] as string[],
      },
      setEquipmentSelections: (sel) =>
        set((s) => ({
          equipmentSelections: { ...s.equipmentSelections, ...sel },
        })),

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
      audioTrack: null as AudioTrack | null,
      setAudioTrack: (track) => set({ audioTrack: track }),

      // Video Jobs
      videoJobs: [] as VideoJob[],
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

      // UI Preferences
      uiPreferences: {
        defaultProvider: "wan",
        defaultAspectRatio: "16:9",
        dialogueEnabledByDefault: true,
        guidedMode: true,
      },
      setUIPreferences: (prefs) =>
        set((s) => ({ uiPreferences: { ...s.uiPreferences, ...prefs } })),

      // Cost Tracking
      costLog: [] as CostEntry[],
      addCostEntry: (entry) =>
        set((s) => ({ costLog: [...s.costLog, entry] })),
      clearCostLog: () => set({ costLog: [] }),

      // Render Timing History — keep last 100 records
      renderTimings: [] as RenderTimingRecord[],
      addRenderTiming: (record) =>
        set((s) => ({ renderTimings: [...s.renderTimings, record].slice(-100) })),
      clearRenderTimings: () => set({ renderTimings: [] }),

      // Final
      finalVideoUrl: null as string | null,
      setFinalVideoUrl: (url) => set({ finalVideoUrl: url }),
    }),
    {
      name: "ai-director-storage",
      partialize: (state) => ({
        apiKeys: state.apiKeys,
        characters: state.characters,
        theme: state.theme,
        visualPreset: state.visualPreset,
        scenes: state.scenes,
        councilVotes: state.councilVotes,
        anthologySelections: state.anthologySelections,
        equipmentSelections: state.equipmentSelections,
        uiPreferences: state.uiPreferences,
        costLog: state.costLog,
        renderTimings: state.renderTimings,
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

// ============================================================
// PROJECT EXPORT/IMPORT (standalone functions — feature #10)
// ============================================================

export function exportProject(): ProjectExport {
  const s = useAppStore.getState();
  return {
    version: "1.0.0",
    exportDate: new Date().toISOString(),
    theme: s.theme,
    characters: s.characters.map((c) => ({ ...c, photoUrl: null })),
    scenes: s.scenes.map((sc) => ({
      ...sc,
      videoUrl: undefined,
      previousVideoUrl: undefined,
      thumbnailUrl: undefined,
    })),
    visualPreset: s.visualPreset,
    councilVotes: s.councilVotes,
    anthologySelections: s.anthologySelections,
    equipmentSelections: s.equipmentSelections,
    musicSettings: s.musicSettings,
    selectedProvider: s.selectedProvider,
    uiPreferences: s.uiPreferences,
  };
}

export function importProject(data: ProjectExport): void {
  useAppStore.setState({
    theme: data.theme,
    characters: data.characters,
    scenes: data.scenes.map((sc, idx) => ({
      ...sc,
      status: sc.videoUrl ? sc.status : ("pending" as const),
      order: idx,
      sceneNumber: idx + 1,
    })),
    visualPreset: data.visualPreset,
    councilVotes: data.councilVotes || [],
    anthologySelections: data.anthologySelections || { directorStyle: null, colorGrade: null, promptHints: [] },
    equipmentSelections: data.equipmentSelections || { cameraId: null, lensId: null, lightingStyleId: null, promptHints: [] },
    musicSettings: data.musicSettings,
    selectedProvider: data.selectedProvider || "wan",
    uiPreferences: data.uiPreferences || { defaultProvider: "wan", defaultAspectRatio: "16:9", dialogueEnabledByDefault: true, guidedMode: true },
  });
}
