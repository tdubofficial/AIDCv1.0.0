import { useState, useCallback } from "react";
import { Loader2, Check, RotateCcw, Sparkles, Film, Camera, Scissors, Music, Merge } from "lucide-react";
import { useAppStore } from "~/app/lib/store";
import type { CouncilVote, SceneCouncilVotes } from "~/app/types";

const EXPERTS = [
  {
    id: "director",
    name: "Director AI",
    specialty: "Narrative & Blocking",
    icon: Film,
    color: "emerald",
    systemPrompt: "You are a master film director. Evaluate this scene from a narrative and blocking perspective. Suggest improvements to dramatic tension, pacing, character positioning, and emotional arc.",
  },
  {
    id: "cinematographer",
    name: "Cinematographer AI",
    specialty: "Camera & Lighting",
    icon: Camera,
    color: "blue",
    systemPrompt: "You are an award-winning cinematographer. Evaluate this scene's camera work and lighting. Suggest improvements to camera angles, movements, lens choice, depth of field, and lighting setups for maximum visual impact.",
  },
  {
    id: "editor",
    name: "Editor AI",
    specialty: "Pacing & Continuity",
    icon: Scissors,
    color: "amber",
    systemPrompt: "You are an expert film editor. Evaluate this scene for pacing, rhythm, and continuity. Suggest improvements to scene duration, cut timing, transitions, and how it flows with adjacent scenes.",
  },
  {
    id: "composer",
    name: "Music Supervisor AI",
    specialty: "Tone & Atmosphere",
    icon: Music,
    color: "purple",
    systemPrompt: "You are a music supervisor and sound designer. Evaluate this scene's overall mood and atmosphere. Suggest improvements to the tonal quality, sonic landscape, and how visual elements support the emotional tone.",
  },
] as const;

function getGeminiKey(): string {
  try {
    const stored = localStorage.getItem("ai-director-storage");
    if (stored) {
      const data = JSON.parse(stored);
      return data?.state?.apiKeys?.gemini || "";
    }
  } catch {}
  return "";
}

async function getExpertVote(
  expert: (typeof EXPERTS)[number],
  scene: { title: string; description: string; prompt: string; cameraAngle: string; lighting: string; characters: string[]; dialog: string; duration: number },
  theme: { title: string; genre: string; synopsis: string; tone: string }
): Promise<CouncilVote> {
  const apiKey = getGeminiKey();

  if (!apiKey) {
    return generateLocalVote(expert, scene);
  }

  const prompt = `${expert.systemPrompt}

Film: "${theme.title}" (${theme.genre}, ${theme.tone} tone)
Synopsis: ${theme.synopsis}

Scene: "${scene.title}"
Description: ${scene.description}
Camera: ${scene.cameraAngle}
Lighting: ${scene.lighting}
Characters: ${scene.characters.join(", ") || "None specified"}
Dialog: ${scene.dialog || "None"}
Duration: ${scene.duration}s
Current prompt: ${scene.prompt}

Respond in JSON format:
{
  "recommendation": "Your specific creative recommendation in 2-3 sentences",
  "promptSuggestion": "An enhanced image/video generation prompt that incorporates your recommendation (one paragraph, detailed visual description)",
  "confidence": 85
}

Return ONLY the JSON, no other text.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) throw new Error("Gemini API error");

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Empty response");

    const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());

    return {
      expertId: expert.id,
      expertName: expert.name,
      specialty: expert.specialty,
      recommendation: parsed.recommendation || "No recommendation provided",
      promptSuggestion: parsed.promptSuggestion || scene.prompt,
      confidence: Math.min(100, Math.max(0, parsed.confidence || 75)),
    };
  } catch {
    return generateLocalVote(expert, scene);
  }
}

function generateLocalVote(
  expert: (typeof EXPERTS)[number],
  scene: { title: string; description: string; prompt: string; cameraAngle: string; lighting: string; duration: number }
): CouncilVote {
  const tips: Record<string, { rec: string; hint: string }> = {
    director: {
      rec: `Consider deepening the dramatic tension in "${scene.title}" by adding a moment of stillness before the key action. The blocking could benefit from asymmetric character placement to create visual unease.`,
      hint: "dramatic tension, asymmetric blocking, emotional beat, character-driven staging",
    },
    cinematographer: {
      rec: `The ${scene.cameraAngle} angle works, but I'd suggest transitioning to a low-angle push-in during the climactic moment. Pair with ${scene.lighting === "natural" ? "motivated practical lighting" : scene.lighting + " with rim separation"} for depth.`,
      hint: `low-angle push-in, ${scene.lighting} with rim light separation, shallow depth of field, lens flare accent`,
    },
    editor: {
      rec: `At ${scene.duration}s this scene ${scene.duration > 5 ? "has room for a breath beat — consider a 1-second hold on a reaction shot" : "is tight — every frame counts, cut to motion not static"}. The rhythm should ${scene.duration > 5 ? "build gradually" : "hit fast and hard"}.`,
      hint: `${scene.duration > 5 ? "gradual build, reaction pause, deliberate pacing" : "rapid cuts, dynamic motion, punchy rhythm"}`,
    },
    composer: {
      rec: `The atmosphere of "${scene.title}" would benefit from ${scene.lighting === "noir" || scene.lighting === "dramatic" ? "low ambient drone with subtle dissonance" : "warm textural layers with gentle progression"}. Sound design should echo the visual mood.`,
      hint: `${scene.lighting === "noir" || scene.lighting === "dramatic" ? "moody atmosphere, tension, shadowy ambiance" : "warm tone, gentle atmosphere, organic texture"}`,
    },
  };

  const tip = tips[expert.id] || { rec: "Consider enhancing the visual storytelling.", hint: "cinematic enhancement" };

  return {
    expertId: expert.id,
    expertName: expert.name,
    specialty: expert.specialty,
    recommendation: tip.rec,
    promptSuggestion: `${scene.prompt}. ${tip.hint}.`,
    confidence: 70 + Math.floor(Math.random() * 25),
  };
}

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; ring: string }> = {
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", ring: "ring-emerald-500" },
  blue: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30", ring: "ring-blue-500" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", ring: "ring-amber-500" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30", ring: "ring-purple-500" },
};

export function CouncilManager() {
  const { scenes, theme, councilVotes, setCouncilVotes, updateCouncilVote, updateScene, setActiveTab } = useAppStore();
  const [votingSceneId, setVotingSceneId] = useState<string | null>(null);
  const [expandedScene, setExpandedScene] = useState<string | null>(null);

  const handleRequestVotes = useCallback(
    async (sceneId: string) => {
      const scene = scenes.find((s) => s.id === sceneId);
      if (!scene) return;

      setVotingSceneId(sceneId);

      // Initialize or update the council vote entry
      const existing = councilVotes.find((cv) => cv.sceneId === sceneId);
      if (!existing) {
        setCouncilVotes([...councilVotes, { sceneId, votes: [], selectedVoteIdx: null, status: "voting" }]);
      } else {
        updateCouncilVote(sceneId, { status: "voting", votes: [], selectedVoteIdx: null });
      }

      // Get all expert votes in parallel
      const votes = await Promise.all(
        EXPERTS.map((expert) => getExpertVote(expert, scene, theme))
      );

      updateCouncilVote(sceneId, { votes, status: "voted" });
      setVotingSceneId(null);
      setExpandedScene(sceneId);
    },
    [scenes, theme, councilVotes, setCouncilVotes, updateCouncilVote]
  );

  const handleSelectApproach = useCallback(
    (sceneId: string, voteIdx: number) => {
      const cv = councilVotes.find((v) => v.sceneId === sceneId);
      if (!cv || !cv.votes[voteIdx]) return;

      const selectedVote = cv.votes[voteIdx];
      updateCouncilVote(sceneId, { selectedVoteIdx: voteIdx, status: "decided" });
      updateScene(sceneId, {
        councilPrompt: selectedVote.promptSuggestion,
        selectedApproach: `${selectedVote.expertName}: ${selectedVote.recommendation}`,
      });
    },
    [councilVotes, updateCouncilVote, updateScene]
  );

  const handleVoteAll = useCallback(async () => {
    for (const scene of scenes) {
      const cv = councilVotes.find((v) => v.sceneId === scene.id);
      if (cv?.status === "decided") continue;
      await handleRequestVotes(scene.id);
    }
  }, [scenes, councilVotes, handleRequestVotes]);

  // ============================================================
  // COUNCIL MERGE MODE (Feature #7)
  // ============================================================
  const [mergingSceneId, setMergingSceneId] = useState<string | null>(null);

  const handleMergeExperts = useCallback(
    async (sceneId: string) => {
      const cv = councilVotes.find((v) => v.sceneId === sceneId);
      if (!cv || cv.votes.length < 2) return;

      setMergingSceneId(sceneId);

      const apiKey = getGeminiKey();
      const scene = scenes.find((s) => s.id === sceneId);
      if (!scene) { setMergingSceneId(null); return; }

      const expertSummaries = cv.votes
        .map((v) => `[${v.expertName} — ${v.specialty}] ${v.recommendation}\nPrompt: ${v.promptSuggestion}`)
        .join("\n\n");

      if (!apiKey) {
        // Fallback: simple concatenation of key hints from each expert
        const mergedPrompt = cv.votes.map((v) => v.promptSuggestion).join(". ");
        updateCouncilVote(sceneId, { mergedPrompt, selectedVoteIdx: null, status: "decided" });
        updateScene(sceneId, {
          councilPrompt: mergedPrompt,
          selectedApproach: "Merged: All experts combined",
        });
        setMergingSceneId(null);
        return;
      }

      try {
        const prompt = `You are a senior film director synthesizing feedback from multiple AI experts into one unified creative direction.

Scene: "${scene.title}" — ${scene.description}
Current prompt: ${scene.prompt}

Expert Recommendations:
${expertSummaries}

Synthesize the BEST ideas from ALL experts into ONE cohesive enhanced prompt. Keep it as a single paragraph — a detailed visual description for an AI video generator. Blend narrative, cinematography, pacing, and tonal suggestions into a unified vision. Focus on visual language.

Respond in JSON:
{ "mergedPrompt": "Your synthesized prompt paragraph here" }

Return ONLY the JSON.`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.7, responseMimeType: "application/json" },
            }),
          }
        );

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = JSON.parse((text || "{}").replace(/```json\n?|\n?```/g, "").trim());
        const mergedPrompt = parsed.mergedPrompt || cv.votes.map((v) => v.promptSuggestion).join(". ");

        updateCouncilVote(sceneId, { mergedPrompt, selectedVoteIdx: null, status: "decided" });
        updateScene(sceneId, {
          councilPrompt: mergedPrompt,
          selectedApproach: "Merged: Synthesized from all experts",
        });
      } catch {
        const mergedPrompt = cv.votes.map((v) => v.promptSuggestion).join(". ");
        updateCouncilVote(sceneId, { mergedPrompt, selectedVoteIdx: null, status: "decided" });
        updateScene(sceneId, {
          councilPrompt: mergedPrompt,
          selectedApproach: "Merged: All experts combined (fallback)",
        });
      } finally {
        setMergingSceneId(null);
      }
    },
    [councilVotes, scenes, updateCouncilVote, updateScene]
  );

  const decidedCount = councilVotes.filter((cv) => cv.status === "decided").length;
  const allDecided = decidedCount === scenes.length && scenes.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold text-white mb-1">Council of Experts</h2>
          <p className="text-stone-400 text-sm">
            Each AI expert reviews your scenes and proposes creative improvements. Pick the winning approach.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-500">
            {decidedCount}/{scenes.length} scenes decided
          </span>
          {scenes.length > 0 && !allDecided && (
            <button
              onClick={handleVoteAll}
              disabled={votingSceneId !== null}
              className="bg-stone-800 hover:bg-stone-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              Vote All Scenes
            </button>
          )}
          {allDecided && (
            <button
              onClick={() => setActiveTab("anthologies")}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Continue to Anthologies
            </button>
          )}
        </div>
      </div>

      {/* Expert Legend */}
      <div className="flex gap-3 flex-wrap">
        {EXPERTS.map((expert) => {
          const colors = COLOR_MAP[expert.color];
          const Icon = expert.icon;
          return (
            <div key={expert.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${colors.bg} ${colors.border} border`}>
              <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
              <span className={`text-xs font-medium ${colors.text}`}>{expert.name}</span>
              <span className="text-xs text-stone-500">· {expert.specialty}</span>
            </div>
          );
        })}
      </div>

      {scenes.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-stone-800 rounded-xl">
          <Film className="w-12 h-12 text-stone-700 mx-auto mb-4" />
          <p className="text-stone-500">No storyboard scenes yet. Complete the Storyboard step first.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {scenes.map((scene) => {
            const cv = councilVotes.find((v) => v.sceneId === scene.id);
            const isVoting = votingSceneId === scene.id;
            const isExpanded = expandedScene === scene.id;
            const isDecided = cv?.status === "decided";

            return (
              <div
                key={scene.id}
                className={`bg-stone-900 border rounded-xl overflow-hidden transition-all ${
                  isDecided ? "border-emerald-500/30" : "border-stone-800 hover:border-stone-700"
                }`}
              >
                {/* Scene Header */}
                <div
                  className="p-5 flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedScene(isExpanded ? null : scene.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-stone-950 flex items-center justify-center border border-stone-800">
                      <span className="font-serif text-lg font-bold text-emerald-500">
                        {scene.sceneNumber.toString().padStart(2, "0")}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-white font-medium">{scene.title}</h3>
                      <p className="text-sm text-stone-400 line-clamp-1">{scene.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isDecided && cv?.selectedVoteIdx != null && (
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        {cv.votes[cv.selectedVoteIdx]?.expertName}
                      </span>
                    )}
                    {!cv || cv.status === "pending" ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRequestVotes(scene.id);
                        }}
                        disabled={isVoting}
                        className="bg-stone-800 hover:bg-stone-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        {isVoting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Consulting...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Request Votes
                          </>
                        )}
                      </button>
                    ) : isDecided ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRequestVotes(scene.id);
                        }}
                        disabled={isVoting}
                        className="text-stone-500 hover:text-stone-300 p-2 rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50"
                        title="Re-vote"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    ) : cv.status === "voted" ? (
                      <span className="text-xs text-amber-400">Select an approach below</span>
                    ) : null}
                  </div>
                </div>

                {/* Votes Panel */}
                {isExpanded && cv && cv.votes.length > 0 && (
                  <div className="border-t border-stone-800 p-5 space-y-3">
                    <h4 className="text-xs uppercase tracking-wider text-stone-500 font-medium mb-3">
                      Expert Recommendations — Click to select the winning approach
                    </h4>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {cv.votes.map((vote, idx) => {
                        const expert = EXPERTS.find((e) => e.id === vote.expertId);
                        const colors = COLOR_MAP[expert?.color || "emerald"];
                        const isSelected = cv.selectedVoteIdx === idx;

                        return (
                          <button
                            key={vote.expertId}
                            onClick={() => handleSelectApproach(scene.id, idx)}
                            className={`text-left p-4 rounded-xl border-2 transition-all ${
                              isSelected
                                ? `${colors.border} ${colors.bg} ring-2 ${colors.ring}/30`
                                : "border-stone-800 hover:border-stone-600 bg-stone-950"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-semibold ${colors.text}`}>{vote.expertName}</span>
                                <span className="text-[10px] text-stone-500">{vote.specialty}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="w-16 h-1.5 bg-stone-800 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${isSelected ? "bg-emerald-500" : "bg-stone-600"}`}
                                    style={{ width: `${vote.confidence}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-stone-500">{vote.confidence}%</span>
                              </div>
                            </div>
                            <p className="text-sm text-stone-300 mb-2">{vote.recommendation}</p>
                            <div className="bg-stone-900/50 rounded-lg p-2 mt-2">
                              <p className="text-[11px] text-stone-500 leading-relaxed line-clamp-3">
                                <span className="text-stone-400 font-medium">Enhanced prompt: </span>
                                {vote.promptSuggestion}
                              </p>
                            </div>
                            {isSelected && (
                              <div className="mt-2 flex items-center gap-1 text-emerald-400 text-xs">
                                <Check className="w-3.5 h-3.5" />
                                Selected approach
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Merge Best Ideas Button (Feature #7) */}
                    {cv.votes.length >= 2 && (
                      <div className="mt-4 pt-4 border-t border-stone-800">
                        <button
                          onClick={() => handleMergeExperts(scene.id)}
                          disabled={mergingSceneId === scene.id}
                          className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 disabled:from-stone-800 disabled:to-stone-800 disabled:text-stone-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all w-full justify-center"
                        >
                          {mergingSceneId === scene.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Synthesizing expert ideas...
                            </>
                          ) : (
                            <>
                              <Merge className="w-4 h-4" />
                              Merge Best Ideas from All Experts
                            </>
                          )}
                        </button>
                        {cv.mergedPrompt && (
                          <div className="mt-3 bg-gradient-to-r from-emerald-500/5 to-blue-500/5 border border-emerald-500/20 rounded-lg p-3">
                            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium mb-1">
                              <Merge className="w-3 h-3" />
                              Merged Synthesis
                            </div>
                            <p className="text-[11px] text-stone-400 leading-relaxed">{cv.mergedPrompt}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Voting in progress */}
                {isVoting && (
                  <div className="border-t border-stone-800 p-8 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-3" />
                      <p className="text-stone-400 text-sm">Council is deliberating...</p>
                      <p className="text-stone-600 text-xs mt-1">Each expert is analyzing the scene</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
