import { useState } from "react";
import { Check, BookOpen, Sparkles, User, Palette } from "lucide-react";
import { useAppStore } from "~/app/lib/store";
import { DIRECTORS, GRADING } from "~/app/lib/anthologies";

type CategoryTab = "directors" | "grading";

const allDirectors = [
  ...DIRECTORS.narrative.map((d) => ({ ...d, category: "Narrative" })),
  ...DIRECTORS.musicVideo.map((d) => ({ ...d, category: "Music Video" })),
  ...DIRECTORS.dps.map((d) => ({ ...d, category: "Cinematographer" })),
];

export function AnthologyBrowser() {
  const { anthologySelections, setAnthologySelections, setActiveTab } = useAppStore();
  const [activeCategory, setActiveCategory] = useState<CategoryTab>("directors");

  const handleSelectDirector = (id: string) => {
    const isDeselect = anthologySelections.directorStyle === id;
    const director = allDirectors.find((d) => d.id === id);
    const newHints = buildPromptHints(
      isDeselect ? null : id,
      anthologySelections.colorGrade
    );
    setAnthologySelections({
      directorStyle: isDeselect ? null : id,
      promptHints: newHints,
    });
  };

  const handleSelectGrade = (id: string) => {
    const isDeselect = anthologySelections.colorGrade === id;
    const newHints = buildPromptHints(
      anthologySelections.directorStyle,
      isDeselect ? null : id
    );
    setAnthologySelections({
      colorGrade: isDeselect ? null : id,
      promptHints: newHints,
    });
  };

  const selectedDirector = allDirectors.find((d) => d.id === anthologySelections.directorStyle);
  const selectedGrade = GRADING.find((g) => g.id === anthologySelections.colorGrade);

  const hasSelections = anthologySelections.directorStyle || anthologySelections.colorGrade;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold text-white mb-1">Anthologies</h2>
          <p className="text-stone-400 text-sm">
            Select a director style and color grading preset to define the global visual identity of your project.
          </p>
        </div>
        <button
          onClick={() => setActiveTab("equipment")}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Continue to Equipment
        </button>
      </div>

      {/* Current Selections Summary */}
      {hasSelections && (
        <div className="bg-stone-900 border border-emerald-500/20 rounded-xl p-4">
          <h3 className="text-xs uppercase tracking-wider text-emerald-400 font-medium mb-3">
            Active Global Presets
          </h3>
          <div className="flex flex-wrap gap-3">
            {selectedDirector && (
              <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-300 px-3 py-1.5 rounded-lg text-sm">
                <User className="w-3.5 h-3.5" />
                <span className="font-medium">{selectedDirector.name}</span>
                <span className="text-emerald-500/60">·</span>
                <span className="text-xs text-emerald-400/70">{selectedDirector.style}</span>
              </div>
            )}
            {selectedGrade && (
              <div className="flex items-center gap-2 bg-purple-500/10 text-purple-300 px-3 py-1.5 rounded-lg text-sm">
                <Palette className="w-3.5 h-3.5" />
                <span className="font-medium">{selectedGrade.name}</span>
                <span className="text-purple-500/60">·</span>
                <span className="text-xs text-purple-400/70">{selectedGrade.desc}</span>
              </div>
            )}
          </div>
          {anthologySelections.promptHints.length > 0 && (
            <div className="mt-3 bg-stone-950 rounded-lg p-3">
              <p className="text-[11px] text-stone-500">
                <span className="text-stone-400 font-medium">Prompt injection: </span>
                {anthologySelections.promptHints.join(". ")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex gap-2 border-b border-stone-800 pb-3">
        <button
          onClick={() => setActiveCategory("directors")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeCategory === "directors"
              ? "bg-emerald-600 text-white"
              : "bg-stone-900 text-stone-400 hover:text-white hover:bg-stone-800"
          }`}
        >
          <User className="w-4 h-4 inline mr-1.5" />
          Director & DP Styles
        </button>
        <button
          onClick={() => setActiveCategory("grading")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeCategory === "grading"
              ? "bg-purple-600 text-white"
              : "bg-stone-900 text-stone-400 hover:text-white hover:bg-stone-800"
          }`}
        >
          <Palette className="w-4 h-4 inline mr-1.5" />
          Color Grading
        </button>
      </div>

      {/* Directors Grid */}
      {activeCategory === "directors" && (
        <div>
          {(["Narrative", "Music Video", "Cinematographer"] as const).map((cat) => {
            const group = allDirectors.filter((d) => d.category === cat);
            return (
              <div key={cat} className="mb-6">
                <h3 className="text-sm font-medium text-stone-400 uppercase tracking-wider mb-3">{cat}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.map((director) => {
                    const isSelected = anthologySelections.directorStyle === director.id;
                    return (
                      <button
                        key={director.id}
                        onClick={() => handleSelectDirector(director.id)}
                        className={`text-left p-4 rounded-xl border-2 transition-all ${
                          isSelected
                            ? "border-emerald-500/50 bg-emerald-500/5 ring-2 ring-emerald-500/20"
                            : "border-stone-800 hover:border-stone-600 bg-stone-900"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-white font-medium text-sm">{director.name}</span>
                          {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                        </div>
                        <p className="text-xs text-stone-400 mb-2">{director.style}</p>
                        <div className="bg-stone-950 rounded px-2 py-1">
                          <p className="text-[10px] text-stone-500">{director.promptHints}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Color Grading Grid */}
      {activeCategory === "grading" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {GRADING.map((grade) => {
            const isSelected = anthologySelections.colorGrade === grade.id;
            return (
              <button
                key={grade.id}
                onClick={() => handleSelectGrade(grade.id)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? "border-purple-500/50 bg-purple-500/5 ring-2 ring-purple-500/20"
                    : "border-stone-800 hover:border-stone-600 bg-stone-900"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-white font-medium text-sm">{grade.name}</span>
                  {isSelected && <Check className="w-4 h-4 text-purple-400" />}
                </div>
                <p className="text-xs text-stone-400 mb-2">{grade.desc}</p>
                <div className="bg-stone-950 rounded px-2 py-1">
                  <p className="text-[10px] text-stone-500">{grade.promptHints}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Build aggregated prompt hints from selections */
function buildPromptHints(directorId: string | null, gradeId: string | null): string[] {
  const hints: string[] = [];

  if (directorId) {
    const allDirs = [
      ...DIRECTORS.narrative,
      ...DIRECTORS.musicVideo,
      ...DIRECTORS.dps,
    ];
    const dir = allDirs.find((d) => d.id === directorId);
    if (dir) hints.push(dir.promptHints);
  }

  if (gradeId) {
    const grade = GRADING.find((g) => g.id === gradeId);
    if (grade) hints.push(grade.promptHints);
  }

  return hints;
}
