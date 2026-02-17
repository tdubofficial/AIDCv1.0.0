import { useState, useRef, useCallback } from "react";
import { Users, Wand2, Film, Scissors, Music, Key, Clapperboard, BookOpen, Camera, Vote, Save, FolderOpen, DollarSign, HelpCircle, Settings2, X } from "lucide-react";
import { useAppStore } from "~/app/lib/store";
import { exportProject, importProject } from "~/app/lib/store";
import { CastManager } from "~/app/components/CastManager";
import { StoryboardGenerator } from "~/app/components/StoryboardGenerator";
import { ProductionBoard } from "~/app/components/ProductionBoard";
import { VideoCompiler } from "~/app/components/VideoCompiler";
import { MusicVideoMode } from "~/app/components/MusicVideoMode";
import { CouncilManager } from "~/app/components/CouncilManager";
import { AnthologyBrowser } from "~/app/components/AnthologyBrowser";
import { CameraEquipmentDB } from "~/app/components/CameraEquipmentDB";
import { estimateCost } from "~/app/lib/video/providers";

const TABS = [
  { id: "cast", label: "Cast", icon: Users, description: "Define your characters" },
  { id: "theme", label: "Storyboard", icon: Wand2, description: "Shape your vision" },
  { id: "council", label: "Council", icon: Vote, description: "AI experts vote on direction" },
  { id: "anthologies", label: "Anthologies", icon: BookOpen, description: "Global visual presets" },
  { id: "equipment", label: "Equipment", icon: Camera, description: "Camera & lens setup" },
  { id: "production", label: "Render", icon: Film, description: "Generate cinematic clips" },
  { id: "compile", label: "Export", icon: Scissors, description: "Compile and export" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function App() {
  const { activeTab, setActiveTab, apiKeys, setApiKey, uiPreferences, setUIPreferences, costLog, clearCostLog, scenes, selectedProvider } = useAppStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showCostDashboard, setShowCostDashboard] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const currentTabIndex = TABS.findIndex((t) => t.id === activeTab);
  const guidedMode = uiPreferences.guidedMode;

  // Project Export (Feature #10)
  const handleExportProject = useCallback(() => {
    const data = exportProject();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aidc_project_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleImportProject = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        importProject(data);
      } catch {
        alert("Invalid project file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  // Cost Dashboard totals (Feature #13)
  const totalSpent = costLog.reduce((acc, c) => acc + c.estimatedCost, 0);
  const sessionEstimate = scenes.reduce((acc, s) => acc + estimateCost(selectedProvider, s.duration), 0);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-300 flex flex-col">
      {/* Header */}
      <header className="border-b border-stone-900 bg-stone-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Clapperboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-serif font-bold text-white leading-tight">
                AI Director's Chair
              </h1>
              <p className="text-[10px] text-stone-500 uppercase tracking-widest">
                Video Production Suite
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Music Video Mode indicator */}
            <MusicModeIndicator />

            {/* Project Save/Load (Feature #10) */}
            <input ref={importInputRef} type="file" accept=".json" className="hidden" onChange={handleImportProject} />
            <button
              onClick={handleExportProject}
              className="p-2 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
              title="Save project"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={() => importInputRef.current?.click()}
              className="p-2 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
              title="Load project"
            >
              <FolderOpen className="w-4 h-4" />
            </button>

            {/* Cost Dashboard Toggle (Feature #13) */}
            <button
              onClick={() => setShowCostDashboard(!showCostDashboard)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                showCostDashboard
                  ? "bg-amber-600/20 text-amber-400"
                  : totalSpent > 0
                    ? "bg-amber-500/10 text-amber-400/80 hover:bg-amber-500/20"
                    : "text-stone-400 hover:text-white hover:bg-stone-800"
              }`}
              title="Cost dashboard"
            >
              <DollarSign className="w-3.5 h-3.5" />
              {totalSpent > 0 && <span>${totalSpent.toFixed(2)}</span>}
            </button>

            {/* Settings */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-colors ${
                showSettings
                  ? "bg-emerald-600 text-white"
                  : "text-stone-400 hover:text-white hover:bg-stone-800"
              }`}
            >
              <Key className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-1">
            {TABS.map((tab, idx) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isCompleted = idx < currentTabIndex;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-5 py-3 text-sm font-medium rounded-t-lg transition-all ${
                    isActive
                      ? "bg-stone-900 text-emerald-400 border-t-2 border-emerald-500"
                      : isCompleted
                        ? "text-stone-400 hover:text-white hover:bg-stone-900/50"
                        : "text-stone-600 hover:text-stone-400 hover:bg-stone-900/30"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {isCompleted && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* API Keys & Preferences Panel */}
      {showSettings && (
        <div className="bg-stone-900 border-b border-stone-800 animate-fade-in">
          <div className="max-w-7xl mx-auto px-6 py-5">
            <h3 className="text-sm font-medium text-stone-300 mb-4">
              API Configuration
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-stone-500 uppercase tracking-wider">
                  Google Gemini API Key
                </label>
                <input
                  type="password"
                  value={apiKeys.gemini}
                  onChange={(e) =>
                    setApiKey("gemini", e.target.value)
                  }
                  placeholder="AIza..."
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-stone-700 focus:outline-none focus:border-emerald-500/50"
                />
                <p className="text-[10px] text-stone-600">
                  Used for storyboard generation (Gemini 2.0 Flash)
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-stone-500 uppercase tracking-wider">
                  Fal.ai API Key
                </label>
                <input
                  type="password"
                  value={apiKeys.fal}
                  onChange={(e) =>
                    setApiKey("fal", e.target.value)
                  }
                  placeholder="fal_..."
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-stone-700 focus:outline-none focus:border-emerald-500/50"
                />
                <p className="text-[10px] text-stone-600">
                  Used for Kling, MiniMax, WAN, Veo 2, LTX, PixVerse & Runway video generation
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-stone-500 uppercase tracking-wider">
                  ElevenLabs API Key
                </label>
                <input
                  type="password"
                  value={apiKeys.elevenlabs}
                  onChange={(e) =>
                    setApiKey("elevenlabs", e.target.value)
                  }
                  placeholder="sk_..."
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-stone-700 focus:outline-none focus:border-emerald-500/50"
                />
                <p className="text-[10px] text-stone-600">
                  Used for premium TTS voices
                </p>
              </div>
            </div>

            {/* UI Preferences (Feature #14) */}
            <div className="mt-5 pt-4 border-t border-stone-800">
              <div className="flex items-center gap-2 mb-3">
                <Settings2 className="w-4 h-4 text-stone-400" />
                <h3 className="text-sm font-medium text-stone-300">Preferences</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-stone-500">Default Provider</label>
                  <select
                    value={uiPreferences.defaultProvider}
                    onChange={(e) => setUIPreferences({ defaultProvider: e.target.value as any })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="auto">Auto-Select</option>
                    <option value="kling">Kling 1.6 Pro</option>
                    <option value="kling-o1">Kling O1</option>
                    <option value="minimax">MiniMax</option>
                    <option value="wan">WAN</option>
                    <option value="omni-human">Omni Human</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-stone-500">Default Aspect Ratio</label>
                  <select
                    value={uiPreferences.defaultAspectRatio}
                    onChange={(e) => setUIPreferences({ defaultAspectRatio: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="16:9">16:9 Landscape</option>
                    <option value="9:16">9:16 Portrait</option>
                    <option value="1:1">1:1 Square</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-stone-500">Dialogue by Default</label>
                  <button
                    onClick={() => setUIPreferences({ dialogueEnabledByDefault: !uiPreferences.dialogueEnabledByDefault })}
                    className={`w-full px-3 py-2 rounded-lg text-sm border transition-colors ${
                      uiPreferences.dialogueEnabledByDefault
                        ? "bg-emerald-600/20 border-emerald-500/30 text-emerald-400"
                        : "bg-stone-950 border-stone-800 text-stone-500"
                    }`}
                  >
                    {uiPreferences.dialogueEnabledByDefault ? "Enabled" : "Disabled"}
                  </button>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-stone-500">Guided Mode</label>
                  <button
                    onClick={() => setUIPreferences({ guidedMode: !uiPreferences.guidedMode })}
                    className={`w-full px-3 py-2 rounded-lg text-sm border transition-colors ${
                      uiPreferences.guidedMode
                        ? "bg-emerald-600/20 border-emerald-500/30 text-emerald-400"
                        : "bg-stone-950 border-stone-800 text-stone-500"
                    }`}
                  >
                    {uiPreferences.guidedMode ? "On" : "Off"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cost Dashboard (Feature #13) */}
      {showCostDashboard && (
        <div className="bg-stone-900 border-b border-stone-800 animate-fade-in">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-medium text-stone-300">Cost Dashboard</h3>
              </div>
              <div className="flex items-center gap-3">
                {costLog.length > 0 && (
                  <button onClick={clearCostLog} className="text-xs text-stone-500 hover:text-red-400 transition-colors">Clear History</button>
                )}
                <button onClick={() => setShowCostDashboard(false)} className="text-stone-500 hover:text-white p-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div className="bg-stone-950 rounded-lg p-3 border border-stone-800">
                <p className="text-[10px] text-stone-500 uppercase tracking-wider">Total Spent</p>
                <p className="text-xl font-bold text-amber-400">${totalSpent.toFixed(2)}</p>
                <p className="text-[10px] text-stone-600">{costLog.length} renders</p>
              </div>
              <div className="bg-stone-950 rounded-lg p-3 border border-stone-800">
                <p className="text-[10px] text-stone-500 uppercase tracking-wider">Session Estimate</p>
                <p className="text-xl font-bold text-stone-300">${sessionEstimate.toFixed(2)}</p>
                <p className="text-[10px] text-stone-600">{scenes.length} scenes queued</p>
              </div>
              <div className="bg-stone-950 rounded-lg p-3 border border-stone-800">
                <p className="text-[10px] text-stone-500 uppercase tracking-wider">Avg. Per Scene</p>
                <p className="text-xl font-bold text-stone-300">${costLog.length > 0 ? (totalSpent / costLog.length).toFixed(2) : "0.00"}</p>
                <p className="text-[10px] text-stone-600">across all providers</p>
              </div>
            </div>
            {costLog.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-1">
                {[...costLog].reverse().slice(0, 10).map((entry, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] px-2 py-1 bg-stone-950 rounded">
                    <span className="text-stone-400">Scene {entry.sceneId.substring(0, 8)}...</span>
                    <span className="text-stone-500">{entry.provider}</span>
                    <span className="text-amber-400">${entry.estimatedCost.toFixed(3)}</span>
                    <span className="text-stone-600">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stepper/Progress Bar */}
      <div className="w-full bg-stone-900 border-b border-stone-800">
        <div className="max-w-7xl mx-auto px-6 py-2 flex items-center gap-2">
          {TABS.map((tab, idx) => (
            <div key={tab.id} className="flex items-center gap-1">
              <div className={`w-2.5 h-2.5 rounded-full ${activeTab === tab.id ? "bg-emerald-400" : idx < currentTabIndex ? "bg-emerald-700" : "bg-stone-700"}`}></div>
              {idx < TABS.length - 1 && <div className="w-8 h-0.5 bg-stone-800" />}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {activeTab === "cast" && <CastManager guided={guidedMode} />}
        {activeTab === "theme" && <StoryboardGenerator guided={guidedMode} />}
        {activeTab === "production" && (
          <div className="space-y-6">
            <MusicVideoMode />
            <ProductionBoard guided={guidedMode} />
          </div>
        )}
        {activeTab === "council" && <CouncilManager />}
        {activeTab === "anthologies" && <AnthologyBrowser />}
        {activeTab === "equipment" && <CameraEquipmentDB />}
        {activeTab === "compile" && <VideoCompiler guided={guidedMode} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-900 py-4">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-xs text-stone-600">
          <span>AI Director's Chair v1.0.0</span>
          <span>All data stored locally · No cloud uploads</span>
        </div>
      </footer>
    </div>
  );
}

function MusicModeIndicator() {
  const { musicSettings } = useAppStore();
  if (!musicSettings.isEnabled) return null;
  return (
    <div className="flex items-center gap-1.5 bg-purple-500/10 text-purple-400 px-3 py-1.5 rounded-lg text-xs font-medium">
      <Music className="w-3.5 h-3.5" />
      Music Video
    </div>
  );
}
