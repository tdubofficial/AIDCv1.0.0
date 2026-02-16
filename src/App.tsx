import { useState } from "react";
import { Users, Wand2, Film, Scissors, Music, Key, Clapperboard } from "lucide-react";
import { useAppStore } from "~/app/lib/store";
import { CastManager } from "~/app/components/CastManager";
import { StoryboardGenerator } from "~/app/components/StoryboardGenerator";
import { ProductionBoard } from "~/app/components/ProductionBoard";
import { VideoCompiler } from "~/app/components/VideoCompiler";
import { MusicVideoMode } from "~/app/components/MusicVideoMode";

const TABS = [
  { id: "cast", label: "Cast", icon: Users, description: "Characters" },
  { id: "theme", label: "Pre-Production", icon: Wand2, description: "Storyboard" },
  { id: "production", label: "Production", icon: Film, description: "Generate" },
  { id: "compile", label: "Final Cut", icon: Scissors, description: "Export" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function App() {
  const { activeTab, setActiveTab, apiKeys, setApiKeys } = useAppStore();
  const [showSettings, setShowSettings] = useState(false);

  const currentTabIndex = TABS.findIndex((t) => t.id === activeTab);

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

      {/* API Keys Panel */}
      {showSettings && (
        <div className="bg-stone-900 border-b border-stone-800 animate-fade-in">
          <div className="max-w-7xl mx-auto px-6 py-5">
            <h3 className="text-sm font-medium text-stone-300 mb-4">
              API Configuration
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-stone-500 uppercase tracking-wider">
                  Google Gemini API Key
                </label>
                <input
                  type="password"
                  value={apiKeys.gemini}
                  onChange={(e) =>
                    setApiKeys({ ...apiKeys, gemini: e.target.value })
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
                    setApiKeys({ ...apiKeys, fal: e.target.value })
                  }
                  placeholder="fal_..."
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-stone-700 focus:outline-none focus:border-emerald-500/50"
                />
                <p className="text-[10px] text-stone-600">
                  Used for Kling, MiniMax, and WAN video generation
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {activeTab === "cast" && <CastManager />}
        {activeTab === "theme" && <StoryboardGenerator />}
        {activeTab === "production" && (
          <div className="space-y-6">
            <MusicVideoMode />
            <ProductionBoard />
          </div>
        )}
        {activeTab === "compile" && <VideoCompiler />}
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
