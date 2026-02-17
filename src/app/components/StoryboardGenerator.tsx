import { useState, useCallback, useRef } from "react";
import { Loader2, Wand2, GripVertical, Trash2, Plus } from "lucide-react";
import { useAppStore } from "~/app/lib/store";
import { generateStoryboard } from "~/app/lib/gemini";
import { GENRE_TAGS, CINEMATIC_PRESETS } from "~/app/lib/anthologies";

export function StoryboardGenerator({ guided }: { guided?: boolean }) {
  const { theme, setTheme, characters, scenes, setScenes, reorderScenes, setActiveTab, apiKeys } = useAppStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

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
        setActiveTab("council");
        return;
      }

      const scenes = await generateStoryboard(theme, characters);
      setScenes(scenes);
      setActiveTab("council");
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

      {/* Scene List with Drag & Drop Reorder (Feature #3) + Thumbnails (Feature #11) */}
      {scenes.length > 0 && (
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-serif text-white font-medium">Storyboard Scenes</h3>
            <span className="text-xs text-stone-500">{scenes.length} scenes · Drag to reorder</span>
          </div>
          <div className="space-y-2">
            {scenes.map((scene, idx) => (
              <div
                key={scene.id}
                draggable
                onDragStart={() => { dragItem.current = idx; }}
                onDragEnter={() => { dragOver.current = idx; }}
                onDragEnd={() => {
                  if (dragItem.current !== null && dragOver.current !== null && dragItem.current !== dragOver.current) {
                    const reordered = [...scenes];
                    const [moved] = reordered.splice(dragItem.current, 1);
                    reordered.splice(dragOver.current, 0, moved);
                    reorderScenes(reordered);
                  }
                  dragItem.current = null;
                  dragOver.current = null;
                }}
                onDragOver={(e) => e.preventDefault()}
                className="flex items-center gap-3 bg-stone-950 border border-stone-800 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-stone-700 transition-all group"
              >
                <GripVertical className="w-4 h-4 text-stone-600 flex-shrink-0 group-hover:text-stone-400" />
                <div className="w-8 h-8 rounded bg-stone-800 flex items-center justify-center flex-shrink-0">
                  {scene.thumbnailUrl ? (
                    <img src={scene.thumbnailUrl} alt="" className="w-8 h-8 rounded object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-emerald-500">{scene.sceneNumber}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm text-white font-medium truncate">{scene.title}</h4>
                  <p className="text-[11px] text-stone-500 truncate">{scene.description}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] text-stone-600">{scene.duration}s</span>
                  <span className="text-[10px] text-stone-600">{scene.cameraAngle}</span>
                  {scene.status === "completed" && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                  <button
                    onClick={() => {
                      const filtered = scenes.filter((s) => s.id !== scene.id);
                      reorderScenes(filtered);
                    }}
                    className="text-stone-600 hover:text-red-400 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove scene"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              const newScene = {
                id: `new-${Date.now()}`,
                sceneNumber: scenes.length + 1,
                title: `Scene ${scenes.length + 1}`,
                description: "New scene",
                cameraAngle: "medium",
                characters: [],
                dialog: "",
                lighting: "natural",
                duration: 5,
                status: "pending" as const,
                prompt: theme.title ? `${theme.tone} ${theme.genre} scene for ${theme.title}` : "New scene",
                order: scenes.length,
              };
              setScenes([...scenes, newScene]);
            }}
            className="flex items-center gap-2 text-xs text-stone-500 hover:text-emerald-400 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Scene
          </button>
        </div>
      )}
    </div>
  );
}
