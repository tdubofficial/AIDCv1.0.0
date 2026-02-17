import { useState } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { useAppStore } from "~/app/lib/store";
import { generateStoryboard } from "~/app/lib/gemini";
import { GENRE_TAGS, CINEMATIC_PRESETS } from "~/app/lib/anthologies";

export function StoryboardGenerator({ guided }: { guided?: boolean }) {
  const { theme, setTheme, characters, setScenes, setActiveTab, apiKeys } = useAppStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!theme.synopsis || characters.length === 0) return;
    setIsGenerating(true);
    setError(null);

    try {
      // If Gemini API key is not configured, generate a lightweight local draft storyboard
      if (!apiKeys?.gemini) {
        const count = Math.max(3, Math.min(8, characters.length + 2));
        const scenes = Array.from({ length: count }).map((_, idx) => {
          const c = characters.length ? characters[idx % characters.length] : null;
          const camera = (['medium','wide','closeup','dolly','static','aerial'] as const)[idx % 6];
          const cameraHint = (CINEMATIC_PRESETS.camera as any)[camera] || "medium shot";
          return {
            id: `draft-${Date.now()}-${idx}`,
            sceneNumber: idx + 1,
            title: c ? `${c.name} Moment` : `Scene ${idx + 1}`,
            description: c
              ? `Draft: ${c.name} in a ${theme.tone} ${theme.genre} moment.`
              : `Draft scene ${idx + 1} for ${theme.title || 'Untitled'}`,
            cameraAngle: camera,
            characters: c ? [c.name] : [],
            dialog: "",
            lighting: "natural",
            duration: 5,
            status: "pending" as const,
            prompt: `${theme.tone} ${theme.genre}. ${cameraHint}. ${c ? c.description : ''}`,
            order: idx,
          };
        });

        setScenes(scenes);
        setActiveTab("production");
        return;
      }

      const scenes = await generateStoryboard(theme, characters);
      setScenes(scenes);
      setActiveTab("production");
    } catch (err: any) {
      setError(err.message || "Failed to generate storyboard");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-serif font-bold text-white">Storyboard & Direction</h2>
        <p className="text-stone-400">Shape your film's creative vision. Set the title, genre, and generate a visual storyboard.</p>
        {guided && (!theme.synopsis || characters.length === 0) && (
          <div className="mt-2 text-emerald-400 text-xs font-semibold">Add a synopsis and at least one character to enable storyboard generation.</div>
        )}
      </div>

      <div className="bg-stone-900 border border-stone-800 rounded-xl p-8 space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-stone-400 uppercase tracking-wider">Film Title</label>
          <input
            type="text"
            value={theme.title}
            onChange={(e) => setTheme({ title: e.target.value })}
            className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-white placeholder-stone-600 focus:outline-none focus:border-emerald-500/50 font-serif text-2xl"
            placeholder="Enter working title..."
          />
        </div>

        {/* Genre + Tone */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-stone-400 uppercase tracking-wider">Genre</label>
            <select
              value={theme.genre}
              onChange={(e) => setTheme({ genre: e.target.value })}
              className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
            >
              {GENRE_TAGS.map((g) => (
                <option key={g.id} value={g.id}>{g.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-stone-400 uppercase tracking-wider">Visual Tone</label>
            <select
              value={theme.tone}
              onChange={(e) => setTheme({ tone: e.target.value })}
              className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
            >
              <option value="cinematic">Cinematic</option>
              <option value="documentary">Documentary / Realistic</option>
              <option value="noir">Film Noir</option>
              <option value="vintage">Vintage / Retro</option>
              <option value="anime">Anime / Stylized</option>
            </select>
          </div>
        </div>

        {/* Synopsis */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-stone-400 uppercase tracking-wider">
            Synopsis &amp; Director&apos;s Vision
          </label>
          <textarea
            value={theme.synopsis}
            onChange={(e) => setTheme({ synopsis: e.target.value })}
            className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-4 text-stone-300 placeholder-stone-600 focus:outline-none focus:border-emerald-500/50 h-48 resize-none"
            placeholder="Describe the story, key scenes, emotional arc, and visual style..."
          />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!theme.synopsis || characters.length === 0 || isGenerating}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-800 disabled:text-stone-600 text-white font-medium py-4 rounded-lg flex items-center justify-center gap-3 transition-all"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Consulting with AI Director...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              Generate Storyboard
            </>
          )}
        </button>

        {characters.length === 0 && (
          <p className="text-xs text-stone-500 text-center">
            Add at least one character in the Cast tab before generating.
          </p>
        )}
      </div>
    </div>
  );
}
