import { useState, useCallback, useEffect, useRef } from "react";
import { Camera, Mic, Video, Check, AlertCircle, Loader2, Film, Settings2, Sparkles, RefreshCw, TriangleAlert, Clock, Volume2, VolumeX, PlayCircle, StopCircle, SkipForward, Edit3, ImagePlus, History, Columns, DollarSign } from "lucide-react";
import { useAppStore } from "~/app/lib/store";
import { generateVideo, checkJobStatus, estimateCost, MODEL_CAPABILITIES, getRestrictionWarnings, estimateRenderSeconds, estimateConfidence, formatRenderTime, type ProviderKey, type RenderEstimateContext } from "~/app/lib/video/providers";
import { speakDialogueUnified, stopDialogue, VOICE_PROFILES, type VoiceConfig } from "~/app/lib/tts";
import type { StoryboardScene, VideoGenerationParams } from "~/app/types";

function resolveProvider(selected: string): Exclude<ProviderKey, "auto"> {
  if (selected !== "auto") return selected as Exclude<ProviderKey, "auto">;
  return "kling";
}

export function ProductionBoard({ guided }: { guided?: boolean }) {
  const {
    scenes, updateScene, characters,
    visualPreset, setVisualPreset,
    selectedProvider, setSelectedProvider,
    anthologySelections, equipmentSelections, councilVotes,
    renderTimings,
  } = useAppStore();
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());

  // Render-All batch state
  const [batchRendering, setBatchRendering] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchFailed, setBatchFailed] = useState(0);
  const cancelBatchRef = useRef(false);
  /** Tracks wall-clock start of the batch and per-scene durations for live ETA */
  const batchTimingRef = useRef<{ start: number; sceneDurations: number[] }>({ start: 0, sceneDurations: [] });
  const [batchElapsed, setBatchElapsed] = useState(0);

  const effectiveProvider = resolveProvider(selectedProvider);
  const caps = MODEL_CAPABILITIES[effectiveProvider] || MODEL_CAPABILITIES.kling;

  /** Build the final prompt for a scene, incorporating council + anthology + equipment */
  const buildFinalPrompt = useCallback(
    (scene: StoryboardScene): string => {
      let base = scene.councilPrompt || scene.prompt;
      if (anthologySelections.promptHints.length > 0) {
        base += ". " + anthologySelections.promptHints.join(". ");
      }
      if (equipmentSelections.promptHints.length > 0) {
        base += ". " + equipmentSelections.promptHints.join(". ");
      }
      return base;
    },
    [anthologySelections.promptHints, equipmentSelections.promptHints]
  );

  const handleGenerateClip = useCallback(async (scene: StoryboardScene) => {
    setGeneratingIds((prev) => new Set(prev).add(scene.id));
    const startTime = Date.now();
    // Save prompt history and previous video before re-render
    const promptHistory = [...(scene.promptHistory || [])];
    const currentPrompt = buildFinalPrompt(scene);
    if (!promptHistory.includes(currentPrompt)) promptHistory.push(currentPrompt);
    const previousVideoUrl = scene.videoUrl || scene.previousVideoUrl;
    updateScene(scene.id, {
      status: "generating", jobStart: startTime, videoUrl: undefined,
      promptHistory,
      previousVideoUrl: previousVideoUrl || undefined,
    });
    // Log cost
    useAppStore.getState().addCostEntry({
      sceneId: scene.id,
      provider: effectiveProvider,
      estimatedCost: estimateCost(effectiveProvider, scene.duration),
      timestamp: startTime,
    });

    try {
      const charPhotos = characters
        .filter((c) => scene.characters.includes(c.name))
        .map((c) => c.photoUrl)
        .filter(Boolean);

      const finalPrompt = buildFinalPrompt(scene);

      // Clamp duration to model max
      const clampedDuration = Math.min(scene.duration, caps.maxDuration);
      // Validate aspect ratio
      const validAR = caps.supportedAspectRatios.includes(visualPreset.aspectRatio)
        ? visualPreset.aspectRatio
        : "16:9";
      // Only pass camera movement if model supports it
      const cameraMove = caps.supportsCameraMovement ? scene.cameraAngle : undefined;

      // Use per-scene reference image first, then character photo
      const imageUrl = scene.referenceImageUrl || (charPhotos[0] as string) || undefined;

      const params: VideoGenerationParams = {
        prompt: finalPrompt,
        imageUrl,
        duration: clampedDuration,
        aspectRatio: validAR as "16:9" | "9:16" | "1:1",
        cameraMovement: cameraMove,
        stylePreset: caps.supportsStylePresets ? visualPreset.style : undefined,
        negativePrompt: caps.supportsNegativePrompt
          ? "blurry, low quality, distorted anatomy, watermark, text"
          : undefined,
      };

      const result = await generateVideo(params, selectedProvider);

      // Poll for completion
      const poll = async () => {
        let attempts = 0;
        while (attempts < 60) {
          await new Promise((r) => setTimeout(r, 5000));
          const status = await checkJobStatus(
            effectiveProvider,
            result.jobId
          );
          if (status.status === "completed" && status.videoUrl) {
            updateScene(scene.id, { status: "completed", videoUrl: status.videoUrl, provider: effectiveProvider });
            setGeneratingIds((prev) => { const n = new Set(prev); n.delete(scene.id); return n; });
            // Record actual render duration for adaptive estimation
            useAppStore.getState().addRenderTiming({
              provider: effectiveProvider,
              outputDuration: scene.duration,
              actualSeconds: Math.round((Date.now() - startTime) / 1000),
              hadImage: !!params.imageUrl,
              promptLength: finalPrompt.length,
              aspectRatio: params.aspectRatio,
              timestamp: Date.now(),
            });
            break;
          }
          if (status.status === "failed") {
            updateScene(scene.id, { status: "error" });
            setGeneratingIds((prev) => { const n = new Set(prev); n.delete(scene.id); return n; });
            break;
          }
          attempts++;
        }
        if (attempts >= 60) {
          updateScene(scene.id, { status: "error" });
          setGeneratingIds((prev) => { const n = new Set(prev); n.delete(scene.id); return n; });
        }
      };

      poll();
    } catch (err) {
      console.error("Generation failed:", err);
      updateScene(scene.id, { status: "error" });
      setGeneratingIds((prev) => { const n = new Set(prev); n.delete(scene.id); return n; });
    }
  }, [characters, selectedProvider, effectiveProvider, updateScene, visualPreset, buildFinalPrompt, caps]);

  /** Generate a single clip and WAIT for it to complete (used by batch render) */
  const handleGenerateClipAsync = useCallback(async (scene: StoryboardScene): Promise<"completed" | "error"> => {
    setGeneratingIds((prev) => new Set(prev).add(scene.id));
    const startTime = Date.now();
    const promptHistory = [...(scene.promptHistory || [])];
    const currentPrompt = buildFinalPrompt(scene);
    if (!promptHistory.includes(currentPrompt)) promptHistory.push(currentPrompt);
    const previousVideoUrl = scene.videoUrl || scene.previousVideoUrl;
    updateScene(scene.id, {
      status: "generating", jobStart: startTime, videoUrl: undefined,
      promptHistory,
      previousVideoUrl: previousVideoUrl || undefined,
    });
    useAppStore.getState().addCostEntry({
      sceneId: scene.id,
      provider: effectiveProvider,
      estimatedCost: estimateCost(effectiveProvider, scene.duration),
      timestamp: startTime,
    });

    try {
      const charPhotos = characters
        .filter((c) => scene.characters.includes(c.name))
        .map((c) => c.photoUrl)
        .filter(Boolean);

      const finalPrompt = buildFinalPrompt(scene);
      const clampedDuration = Math.min(scene.duration, caps.maxDuration);
      const validAR = caps.supportedAspectRatios.includes(visualPreset.aspectRatio)
        ? visualPreset.aspectRatio
        : "16:9";
      const cameraMove = caps.supportsCameraMovement ? scene.cameraAngle : undefined;
      const imageUrl = scene.referenceImageUrl || (charPhotos[0] as string) || undefined;

      const params: VideoGenerationParams = {
        prompt: finalPrompt,
        imageUrl,
        duration: clampedDuration,
        aspectRatio: validAR as "16:9" | "9:16" | "1:1",
        cameraMovement: cameraMove,
        stylePreset: caps.supportsStylePresets ? visualPreset.style : undefined,
        negativePrompt: caps.supportsNegativePrompt
          ? "blurry, low quality, distorted anatomy, watermark, text"
          : undefined,
      };

      const result = await generateVideo(params, selectedProvider);

      // Poll for completion (blocking)
      let attempts = 0;
      while (attempts < 60) {
        await new Promise((r) => setTimeout(r, 5000));
        const status = await checkJobStatus(effectiveProvider, result.jobId);
        if (status.status === "completed" && status.videoUrl) {
          updateScene(scene.id, { status: "completed", videoUrl: status.videoUrl, provider: effectiveProvider });
          setGeneratingIds((prev) => { const n = new Set(prev); n.delete(scene.id); return n; });
          // Record actual render duration for adaptive estimation
          useAppStore.getState().addRenderTiming({
            provider: effectiveProvider,
            outputDuration: scene.duration,
            actualSeconds: Math.round((Date.now() - startTime) / 1000),
            hadImage: !!params.imageUrl,
            promptLength: finalPrompt.length,
            aspectRatio: params.aspectRatio,
            timestamp: Date.now(),
          });
          return "completed";
        }
        if (status.status === "failed") {
          updateScene(scene.id, { status: "error" });
          setGeneratingIds((prev) => { const n = new Set(prev); n.delete(scene.id); return n; });
          return "error";
        }
        attempts++;
      }
      updateScene(scene.id, { status: "error" });
      setGeneratingIds((prev) => { const n = new Set(prev); n.delete(scene.id); return n; });
      return "error";
    } catch (err) {
      console.error("Generation failed:", err);
      updateScene(scene.id, { status: "error" });
      setGeneratingIds((prev) => { const n = new Set(prev); n.delete(scene.id); return n; });
      return "error";
    }
  }, [characters, selectedProvider, effectiveProvider, updateScene, visualPreset, buildFinalPrompt, caps]);

  /** Render all pending/error scenes sequentially */
  const handleRenderAll = useCallback(async () => {
    const pending = scenes.filter(
      (s) => s.status === "pending" || s.status === "error"
    );
    if (pending.length === 0) return;

    cancelBatchRef.current = false;
    setBatchRendering(true);
    setBatchTotal(pending.length);
    setBatchProgress(0);
    setBatchFailed(0);
    batchTimingRef.current = { start: Date.now(), sceneDurations: [] };

    let failed = 0;
    for (let i = 0; i < pending.length; i++) {
      if (cancelBatchRef.current) break;
      const sceneStart = Date.now();
      const result = await handleGenerateClipAsync(pending[i]);
      batchTimingRef.current.sceneDurations.push(Math.round((Date.now() - sceneStart) / 1000));
      if (result === "error") failed++;
      setBatchProgress(i + 1);
      setBatchFailed(failed);
    }

    setBatchRendering(false);
  }, [scenes, handleGenerateClipAsync]);

  const handleCancelBatch = useCallback(() => {
    cancelBatchRef.current = true;
  }, []);

  // Tick batch elapsed every second while rendering
  useEffect(() => {
    if (!batchRendering) { setBatchElapsed(0); return; }
    const iv = setInterval(() => {
      setBatchElapsed(Math.round((Date.now() - batchTimingRef.current.start) / 1000));
    }, 1000);
    return () => clearInterval(iv);
  }, [batchRendering]);

  /** Compute live batch ETA: average of completed scene durations × remaining scenes */
  const batchEtaRemaining = (() => {
    const done = batchTimingRef.current.sceneDurations;
    const remaining = batchTotal - batchProgress;
    if (done.length === 0 || remaining <= 0) return 0;
    const avg = done.reduce((a, b) => a + b, 0) / done.length;
    return Math.round(avg * remaining);
  })();

  const pendingCount = scenes.filter((s) => s.status === "pending" || s.status === "error").length;
  const completedCount = scenes.filter((s) => s.status === "completed").length;

  /** Build estimate context for the adaptive estimator */
  const buildEstCtx = useCallback((scene: StoryboardScene): RenderEstimateContext => ({
    hasImage: !!(scene.referenceImageUrl || characters.find((c) => scene.characters.includes(c.name))?.photoUrl),
    promptLength: buildFinalPrompt(scene).length,
    aspectRatio: visualPreset.aspectRatio,
    history: renderTimings,
  }), [characters, buildFinalPrompt, visualPreset.aspectRatio, renderTimings]);

  const totalCost = scenes.reduce((acc, s) => acc + estimateCost(effectiveProvider, s.duration), 0);
  const totalRenderEst = scenes.reduce((acc, s) => acc + estimateRenderSeconds(effectiveProvider, s.duration, buildEstCtx(s)), 0);
  const confidence = estimateConfidence(effectiveProvider, renderTimings);

  // Count upstream enhancements
  const councilDecisions = councilVotes.filter((cv) => cv.status === "decided").length;
  const hasAnthology = anthologySelections.promptHints.length > 0;
  const hasEquipment = equipmentSelections.promptHints.length > 0;

  // Global restriction warnings for current preset + provider
  const globalWarnings = getRestrictionWarnings(effectiveProvider, visualPreset, Math.max(...scenes.map(s => s.duration), 0));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold text-white mb-1">Render Scenes</h2>
          <p className="text-stone-400 text-sm">Generate cinematic video clips for each storyboarded scene.</p>
          {guided && scenes.length === 0 && (
            <div className="mt-2 text-emerald-400 text-xs font-semibold">No scenes to render. Complete your storyboard first.</div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-500">Est. cost: ${totalCost.toFixed(2)}</span>
          <span className="text-xs text-stone-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Est. render: {formatRenderTime(totalRenderEst)}
            <span className={`ml-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${
              confidence === "learned"   ? "bg-emerald-500/20 text-emerald-400" :
              confidence === "low-data"  ? "bg-amber-500/20 text-amber-400" :
                                           "bg-stone-700 text-stone-400"
            }`}>
              {confidence === "learned" ? "Adaptive" : confidence === "low-data" ? "~Est." : "Default"}
            </span>
          </span>
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value as any)}
            className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-white"
            disabled={batchRendering}
          >
            <option value="auto">Auto-Select</option>
            <option value="kling">Kling 1.6 Pro</option>
            <option value="kling-o1">Kling 2.1 Master (Premium)</option>
            <option value="minimax">MiniMax (Budget)</option>
            <option value="wan">WAN / Alibaba (Motion)</option>
            <option value="omni-human">Omni Human (Realistic People)</option>
            <option value="veo2">Google Veo 2 (Photorealism)</option>
            <option value="ltx">LTX Video (Fast)</option>
            <option value="pixverse">PixVerse v3.5 (Stylized)</option>
            <option value="runway">Runway Gen-3 Turbo (Premium)</option>
          </select>
        </div>
      </div>

      {/* Render All Bar */}
      {scenes.length > 0 && (
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {batchRendering ? (
                <>
                  <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                  <div>
                    <span className="text-sm text-white font-medium">
                      Rendering {batchProgress}/{batchTotal} scenes...
                    </span>
                    {batchFailed > 0 && (
                      <span className="text-xs text-red-400 ml-2">({batchFailed} failed)</span>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-stone-400 mt-0.5">
                      <span>Elapsed: {formatRenderTime(batchElapsed)}</span>
                      {batchEtaRemaining > 0 && (
                        <span className="text-emerald-400">~{formatRenderTime(batchEtaRemaining)} remaining</span>
                      )}
                      {batchTimingRef.current.sceneDurations.length > 0 && (
                        <span className="text-stone-500">
                          (avg {formatRenderTime(Math.round(batchTimingRef.current.sceneDurations.reduce((a, b) => a + b, 0) / batchTimingRef.current.sceneDurations.length))}/scene)
                        </span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Film className="w-5 h-5 text-stone-500" />
                  <div className="text-sm">
                    <span className="text-white font-medium">{completedCount}</span>
                    <span className="text-stone-500">/{scenes.length} rendered</span>
                    {pendingCount > 0 && (
                      <span className="text-stone-400 ml-2">· {pendingCount} pending</span>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {batchRendering ? (
                <button
                  onClick={handleCancelBatch}
                  className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <StopCircle className="w-4 h-4" />
                  Stop After Current
                </button>
              ) : (
                <>
                  {pendingCount > 0 && (
                    <button
                      onClick={handleRenderAll}
                      disabled={generatingIds.size > 0}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-800 disabled:text-stone-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Render All ({pendingCount})
                    </button>
                  )}
                  {completedCount === scenes.length && scenes.length > 0 && (
                    <button
                      onClick={() => useAppStore.getState().setActiveTab("compile")}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      <SkipForward className="w-4 h-4" />
                      Continue to Export
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Batch progress bar */}
          {batchRendering && batchTotal > 0 && (
            <div className="mt-3 space-y-1.5">
              <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.round((batchProgress / batchTotal) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-stone-600">
                <span>Scene {Math.min(batchProgress + 1, batchTotal)} of {batchTotal}</span>
                <span>{Math.round((batchProgress / batchTotal) * 100)}%</span>
              </div>
            </div>
          )}

          {/* Batch complete summary */}
          {!batchRendering && batchTotal > 0 && batchProgress === batchTotal && (
            <div className="mt-3 flex items-center gap-2 text-xs">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">
                Batch complete: {batchTotal - batchFailed} succeeded
                {batchFailed > 0 && <span className="text-red-400">, {batchFailed} failed</span>}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Model Info Bar */}
      <div className="bg-stone-900/60 border border-stone-800 rounded-lg px-4 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4 text-stone-400">
          <span className="text-white font-medium">{caps.name}</span>
          <span>Max {caps.maxDuration}s</span>
          <span>{caps.supportedAspectRatios.join(", ")}</span>
          {caps.supportsImageToVideo && <span className="text-emerald-400">img2vid</span>}
          {caps.supportsCameraMovement && <span className="text-emerald-400">camera ctrl</span>}
          {!caps.supportsCameraMovement && <span className="text-stone-600 line-through">camera ctrl</span>}
          {caps.supportsStylePresets && <span className="text-emerald-400">styles</span>}
          {!caps.supportsStylePresets && <span className="text-stone-600 line-through">styles</span>}
          {caps.supportsNegativePrompt && <span className="text-emerald-400">neg prompt</span>}
          {!caps.supportsNegativePrompt && <span className="text-stone-600 line-through">neg prompt</span>}
        </div>
      </div>

      {/* Global Restriction Warnings */}
      {globalWarnings.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-medium">
            <TriangleAlert className="w-4 h-4" />
            Model Restrictions ({caps.name})
          </div>
          {globalWarnings.map((w, i) => (
            <p key={i} className="text-amber-400/80 text-xs pl-6">• {w}</p>
          ))}
          {caps.notes.map((n, i) => (
            <p key={`note-${i}`} className="text-stone-500 text-xs pl-6 italic">ℹ {n}</p>
          ))}
        </div>
      )}

      {/* Upstream Enhancements Summary */}
      {(councilDecisions > 0 || hasAnthology || hasEquipment) && (
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs uppercase tracking-wider text-emerald-400 font-medium">
              Active Enhancements
            </h3>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {councilDecisions > 0 && (
              <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-lg">
                Council: {councilDecisions}/{scenes.length} scenes enhanced
              </span>
            )}
            {hasAnthology && (
              <span className="bg-purple-500/10 text-purple-400 px-2.5 py-1 rounded-lg">
                Anthology presets active
              </span>
            )}
            {hasEquipment && (
              <span className="bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-lg">
                Equipment config active
              </span>
            )}
          </div>
        </div>
      )}

      {/* Visual Consistency Panel */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="w-4 h-4 text-emerald-400" />
          <h3 className="font-medium text-emerald-400 text-sm">Visual Consistency</h3>
          <span className="ml-auto text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded">Applied to all prompts</span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-stone-500">Style</label>
            <select
              value={visualPreset.style}
              onChange={(e) => setVisualPreset({ style: e.target.value })}
              disabled={!caps.supportsStylePresets}
              className={`w-full bg-stone-950 border rounded px-3 py-2 text-sm text-white ${
                !caps.supportsStylePresets ? "border-stone-800/50 opacity-40 cursor-not-allowed" : "border-stone-800"
              }`}
            >
              <option value="cinematic">Cinematic Realism</option>
              <option value="anime">Anime</option>
              <option value="noir">Film Noir</option>
              <option value="vintage">Vintage</option>
              <option value="documentary">Documentary</option>
            </select>
            {!caps.supportsStylePresets && <span className="text-[10px] text-amber-400/60">Not supported by {caps.name}</span>}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-stone-500">Lighting</label>
            <select value={visualPreset.lighting} onChange={(e) => setVisualPreset({ lighting: e.target.value })} className="w-full bg-stone-950 border border-stone-800 rounded px-3 py-2 text-sm text-white">
              <option value="natural">Natural</option>
              <option value="dramatic">Dramatic</option>
              <option value="golden">Golden Hour</option>
              <option value="neon">Neon</option>
              <option value="noir">Noir</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-stone-500">Default Camera</label>
            <select
              value={visualPreset.camera}
              onChange={(e) => setVisualPreset({ camera: e.target.value })}
              disabled={!caps.supportsCameraMovement}
              className={`w-full bg-stone-950 border rounded px-3 py-2 text-sm text-white ${
                !caps.supportsCameraMovement ? "border-stone-800/50 opacity-40 cursor-not-allowed" : "border-stone-800"
              }`}
            >
              <option value="medium">Medium Shot</option>
              <option value="wide">Wide Shot</option>
              <option value="closeup">Close-Up</option>
              <option value="dolly">Dolly</option>
              <option value="static">Static</option>
              <option value="aerial">Aerial</option>
              <option value="handheld">Handheld</option>
            </select>
            {!caps.supportsCameraMovement && <span className="text-[10px] text-amber-400/60">Not supported by {caps.name}</span>}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-stone-500">Aspect Ratio</label>
            <select value={visualPreset.aspectRatio} onChange={(e) => setVisualPreset({ aspectRatio: e.target.value })} className="w-full bg-stone-950 border border-stone-800 rounded px-3 py-2 text-sm text-white">
              {["16:9", "9:16", "1:1"].map((ar) => (
                <option key={ar} value={ar} disabled={!caps.supportedAspectRatios.includes(ar)}>
                  {ar}{ar === "16:9" ? " Landscape" : ar === "9:16" ? " Portrait" : " Square"}
                  {!caps.supportedAspectRatios.includes(ar) ? " (unsupported)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Scenes */}
      <div className="space-y-4">
        {scenes.map((scene) => {
          const cv = councilVotes.find((v) => v.sceneId === scene.id);
          const sceneWarnings = getRestrictionWarnings(effectiveProvider, visualPreset, scene.duration);
          return (
            <SceneCard
              key={scene.id}
              scene={scene}
              isGenerating={generatingIds.has(scene.id) || scene.status === "generating"}
              onGenerate={() => handleGenerateClip(scene)}
              onRerender={() => handleGenerateClip(scene)}
              hasCouncilEnhancement={cv?.status === "decided"}
              councilExpert={cv?.selectedVoteIdx != null ? cv.votes[cv.selectedVoteIdx]?.expertName : undefined}
              provider={effectiveProvider}
              warnings={sceneWarnings}
              onUpdateScene={(updates) => updateScene(scene.id, updates)}
              buildFinalPrompt={buildFinalPrompt}
              estimateCtx={buildEstCtx(scene)}
            />
          );
        })}
        {scenes.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-stone-800 rounded-xl">
            <Film className="w-12 h-12 text-stone-700 mx-auto mb-4" />
            <p className="text-stone-500">No scenes generated yet. Complete the Storyboard step first.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// SCENE CARD with adaptive timer, re-render, restriction badges
// ============================================================

function SceneCard({
  scene, isGenerating, onGenerate, onRerender, hasCouncilEnhancement, councilExpert, provider, warnings, onUpdateScene, buildFinalPrompt, estimateCtx,
}: {
  scene: StoryboardScene;
  isGenerating: boolean;
  onGenerate: () => void;
  onRerender: () => void;
  hasCouncilEnhancement?: boolean;
  councilExpert?: string;
  provider: string;
  warnings: string[];
  onUpdateScene: (updates: Partial<StoryboardScene>) => void;
  buildFinalPrompt: (scene: StoryboardScene) => string;
  estimateCtx: RenderEstimateContext;
}) {
  const { characters } = useAppStore();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptDraft, setPromptDraft] = useState(scene.prompt);
  const [showHistory, setShowHistory] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const videoElRef = useRef<HTMLVideoElement>(null);
  const prevVideoRef = useRef<HTMLVideoElement>(null);
  const stopFnRef = useRef<(() => void) | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resolve voice config for the first character with dialog
  const dialogChar = scene.characters.length > 0
    ? characters.find((c) => scene.characters.includes(c.name))
    : undefined;

  const { apiKeys } = useAppStore();
  const voiceConfig: VoiceConfig = {
    engine: dialogChar?.voiceEngine || "browser",
    profileId: dialogChar?.voiceProfile || "male-neutral",
    elevenLabsVoiceId: dialogChar?.elevenLabsVoiceId,
    elevenLabsApiKey: apiKeys.elevenlabs,
  };
  const voiceLabel = voiceConfig.engine === "elevenlabs"
    ? dialogChar?.elevenLabsVoiceName || "ElevenLabs"
    : VOICE_PROFILES[voiceConfig.profileId || "male-neutral"]?.label || "Default";

  // Handle reference image upload
  const handleRefImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onUpdateScene({ referenceImageUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  }, [onUpdateScene]);

  // Save edited prompt
  const handleSavePrompt = useCallback(() => {
    onUpdateScene({ prompt: promptDraft, councilPrompt: undefined, selectedApproach: undefined });
    setEditingPrompt(false);
  }, [promptDraft, onUpdateScene]);

  // Revert to a previous prompt from history
  const handleRevertPrompt = useCallback((prompt: string) => {
    onUpdateScene({ prompt, councilPrompt: undefined, selectedApproach: undefined });
    setPromptDraft(prompt);
    setShowHistory(false);
  }, [onUpdateScene]);

  // Play dialogue synced with video
  const handlePlayWithDialogue = useCallback(async () => {
    if (!scene.dialog || isSpeaking) return;
    // Start video playback
    if (videoElRef.current) {
      videoElRef.current.currentTime = 0;
      videoElRef.current.play().catch(() => {});
    }
    setIsSpeaking(true);
    const stopFn = await speakDialogueUnified(scene.dialog, voiceConfig, () => setIsSpeaking(false));
    stopFnRef.current = stopFn;
  }, [scene.dialog, voiceConfig, isSpeaking]);

  const handleStopDialogue = useCallback(() => {
    if (stopFnRef.current) stopFnRef.current();
    stopDialogue();
    setIsSpeaking(false);
    if (videoElRef.current) videoElRef.current.pause();
  }, []);
  // Adaptive ETA timer
  const initialEstimate = estimateRenderSeconds(provider, scene.duration, estimateCtx);
  const sceneConfidence = estimateConfidence(provider, estimateCtx.history);
  const [eta, setEta] = useState({ elapsed: 0, remaining: initialEstimate, phase: "queue" as "queue" | "generating" | "finishing" });
  const phaseRef = useRef({ pollCount: 0, firstPollAt: 0, generating: false });

  useEffect(() => {
    if (scene.status !== "generating" || !scene.jobStart) {
      setEta({ elapsed: 0, remaining: initialEstimate, phase: "queue" });
      phaseRef.current = { pollCount: 0, firstPollAt: 0, generating: false };
      return;
    }

    const totalEstimate = initialEstimate;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - scene.jobStart!) / 1000);
      const caps = MODEL_CAPABILITIES[provider] || MODEL_CAPABILITIES.kling;
      const queuePortion = caps.avgQueueWait;

      // Adaptive phase detection based on elapsed time vs estimates
      let phase: "queue" | "generating" | "finishing";
      let remaining: number;

      if (elapsed < queuePortion * 0.8) {
        phase = "queue";
        remaining = Math.max(1, totalEstimate - elapsed);
      } else if (elapsed < totalEstimate * 0.85) {
        phase = "generating";
        const genElapsed = elapsed - queuePortion;
        const genTotal = totalEstimate - queuePortion;
        const progressRatio = Math.min(genElapsed / Math.max(genTotal, 1), 0.95);
        if (progressRatio > 0 && genElapsed > 0) {
          const projectedTotal = genElapsed / progressRatio;
          remaining = Math.max(1, Math.round(queuePortion + projectedTotal - elapsed));
        } else {
          remaining = Math.max(1, totalEstimate - elapsed);
        }
      } else {
        phase = "finishing";
        remaining = Math.max(0, Math.round(totalEstimate * 1.15 - elapsed));
      }

      setEta({ elapsed, remaining, phase });
    }, 1000);

    return () => clearInterval(interval);
  }, [scene.status, scene.jobStart, provider, scene.duration, initialEstimate]);

  function formatTime(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // Progress bar percentage estimate
  const totalEst = initialEstimate;
  const progressPct = isGenerating && eta.elapsed > 0
    ? Math.min(98, Math.round((eta.elapsed / Math.max(totalEst, 1)) * 100))
    : 0;

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 hover:border-stone-700 transition-all">
      <div className="flex gap-5">
        <div className="w-14 h-14 rounded-lg bg-stone-950 flex items-center justify-center border border-stone-800 flex-shrink-0">
          <span className="font-serif text-xl font-bold text-emerald-500">
            {scene.sceneNumber.toString().padStart(2, "0")}
          </span>
        </div>
        <div className="flex-1 space-y-3 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-medium text-white">{scene.title || scene.description}</h3>
              <p className="text-sm text-stone-400 mt-0.5 line-clamp-2">{scene.description}</p>
              <div className="flex items-center gap-4 mt-1.5 text-xs text-stone-500">
                <span className="flex items-center gap-1"><Camera className="w-3.5 h-3.5" /> {scene.cameraAngle}</span>
                <span className="flex items-center gap-1"><Mic className="w-3.5 h-3.5" /> {scene.lighting}</span>
                <span>{scene.duration}s</span>
                {hasCouncilEnhancement && (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {councilExpert || "Council enhanced"}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {scene.status === "completed" && <span className="text-emerald-400 flex items-center gap-1 text-xs"><Check className="w-3.5 h-3.5" /> Rendered</span>}
              {scene.status === "error" && <span className="text-red-400 flex items-center gap-1 text-xs"><AlertCircle className="w-3.5 h-3.5" /> Failed</span>}
            </div>
          </div>

          {scene.dialog && (
            <div className="bg-stone-950 border-l-2 border-emerald-500/50 pl-3 py-1.5 flex items-center justify-between gap-2">
              <span className="text-stone-400 italic text-sm">&ldquo;{scene.dialog}&rdquo;</span>
              <button
                onClick={isSpeaking ? handleStopDialogue : async () => {
                  setIsSpeaking(true);
                  const stopFn = await speakDialogueUnified(scene.dialog, voiceConfig, () => setIsSpeaking(false));
                  stopFnRef.current = stopFn;
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors flex-shrink-0 ${
                  isSpeaking
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    : "bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-white"
                }`}
                title={isSpeaking ? "Stop" : `Preview dialogue (${voiceLabel})`}
              >
                {isSpeaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                {isSpeaking ? "Stop" : "Listen"}
              </button>
            </div>
          )}

          {/* Prompt Editor (Feature #1) */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setEditingPrompt(!editingPrompt); setPromptDraft(scene.prompt); }}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                  editingPrompt ? "bg-emerald-600/20 text-emerald-400" : "bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-white"
                }`}
              >
                <Edit3 className="w-3 h-3" />
                {editingPrompt ? "Editing" : "Edit Prompt"}
              </button>
              {/* Reference image upload (Feature #4) */}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleRefImageUpload} />
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                  scene.referenceImageUrl ? "bg-blue-600/20 text-blue-400" : "bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-white"
                }`}
                title="Upload reference image for img2vid"
              >
                <ImagePlus className="w-3 h-3" />
                {scene.referenceImageUrl ? "Ref Set" : "Ref Image"}
              </button>
              {/* Prompt History (Feature #5) */}
              {scene.promptHistory && scene.promptHistory.length > 1 && (
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                    showHistory ? "bg-purple-600/20 text-purple-400" : "bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-white"
                  }`}
                >
                  <History className="w-3 h-3" />
                  History ({scene.promptHistory.length})
                </button>
              )}
              {/* Side-by-side compare (Feature #6) */}
              {scene.previousVideoUrl && scene.videoUrl && (
                <button
                  onClick={() => setShowCompare(!showCompare)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                    showCompare ? "bg-amber-600/20 text-amber-400" : "bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-white"
                  }`}
                >
                  <Columns className="w-3 h-3" />
                  Compare
                </button>
              )}
            </div>
            {editingPrompt && (
              <div className="space-y-1.5">
                <textarea
                  value={promptDraft}
                  onChange={(e) => setPromptDraft(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-300 h-24 resize-none focus:outline-none focus:border-emerald-500/50"
                  placeholder="Edit scene prompt..."
                />
                <div className="flex items-center gap-2">
                  <button onClick={handleSavePrompt} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg font-medium">Save</button>
                  <button onClick={() => setEditingPrompt(false)} className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs rounded-lg">Cancel</button>
                  <span className="text-[10px] text-stone-600 ml-auto">Final: {buildFinalPrompt(scene).substring(0, 80)}...</span>
                </div>
              </div>
            )}
            {showHistory && scene.promptHistory && (
              <div className="bg-stone-950 border border-stone-800 rounded-lg p-3 space-y-1.5 max-h-40 overflow-y-auto">
                <span className="text-[10px] text-stone-500 uppercase tracking-wider font-medium">Prompt History</span>
                {scene.promptHistory.map((p, i) => (
                  <div key={i} className="flex items-start gap-2 group">
                    <span className="text-[10px] text-stone-600 mt-0.5 flex-shrink-0">v{i + 1}</span>
                    <p className="text-[11px] text-stone-400 flex-1 line-clamp-2">{p}</p>
                    <button onClick={() => handleRevertPrompt(p)} className="text-[10px] text-emerald-500 hover:text-emerald-400 opacity-0 group-hover:opacity-100 flex-shrink-0">Revert</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reference image thumbnail */}
          {scene.referenceImageUrl && (
            <div className="flex items-center gap-2">
              <img src={scene.referenceImageUrl} alt="Reference" className="w-16 h-10 rounded object-cover border border-stone-700" />
              <span className="text-[10px] text-stone-500">Reference image (img2vid)</span>
              <button onClick={() => onUpdateScene({ referenceImageUrl: undefined })} className="text-[10px] text-red-500 hover:text-red-400 ml-auto">Remove</button>
            </div>
          )}

          {/* Side-by-side compare (Feature #6) */}
          {showCompare && scene.previousVideoUrl && scene.videoUrl && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[10px] text-stone-500 uppercase tracking-wider">Previous</span>
                <video ref={prevVideoRef} src={scene.previousVideoUrl} className="w-full rounded bg-black" controls />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-emerald-400 uppercase tracking-wider">Current</span>
                <video src={scene.videoUrl} className="w-full rounded bg-black" controls />
              </div>
            </div>
          )}

          {/* Per-scene restriction warnings */}
          {warnings.length > 0 && !isGenerating && scene.status !== "completed" && (
            <div className="flex flex-wrap gap-1.5">
              {warnings.map((w, i) => (
                <span key={i} className="text-[10px] bg-amber-500/10 text-amber-400/80 px-2 py-0.5 rounded flex items-center gap-1">
                  <TriangleAlert className="w-2.5 h-2.5" /> {w}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-1.5 flex-wrap">
              {scene.characters.map((char) => (
                <span key={char} className="text-xs bg-stone-800 text-stone-400 px-2 py-0.5 rounded">{char}</span>
              ))}
            </div>

            {/* Completed: show preview + re-render + dialogue play */}
            {scene.videoUrl && scene.status === "completed" ? (
              <div className="flex items-center gap-3">
                <video ref={videoElRef} src={scene.videoUrl} className="w-32 h-20 rounded bg-black object-cover" controls />
                <div className="flex flex-col gap-1.5">
                  {scene.dialog && (
                    <button
                      onClick={isSpeaking ? handleStopDialogue : handlePlayWithDialogue}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isSpeaking
                          ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          : "bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30"
                      }`}
                    >
                      {isSpeaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                      {isSpeaking ? "Stop" : "Play + Voice"}
                    </button>
                  )}
                  <button
                    onClick={onRerender}
                    disabled={isGenerating}
                    className="flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                    title="Re-render with current settings"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Re-render
                  </button>
                  {scene.provider && (
                    <span className="text-[10px] text-stone-600 text-center">
                      via {MODEL_CAPABILITIES[scene.provider]?.name || scene.provider}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              /* Not yet rendered or error: show generate button + timer */
              <div className="flex flex-col items-end gap-1">
                <button
                  onClick={onGenerate}
                  disabled={isGenerating}
                  className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                  {isGenerating ? "Rendering..." : scene.status === "error" ? "Retry" : "Generate Clip"}
                </button>
                <span className="text-xs text-stone-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {isGenerating
                    ? `${formatTime(eta.elapsed)} elapsed · ~${formatTime(eta.remaining)} left (${eta.phase})`
                    : `Est. ${formatRenderTime(initialEstimate)}`}
                  {!isGenerating && estimateCtx.hasImage && <span className="text-blue-400/70 text-[9px]">+img</span>}
                  {!isGenerating && (
                    <span className={`text-[9px] ${
                      sceneConfidence === "learned"  ? "text-emerald-400/60" :
                      sceneConfidence === "low-data" ? "text-amber-400/60" :
                                                       "text-stone-600"
                    }`}>
                      {sceneConfidence === "learned" ? "✓ learned" : sceneConfidence === "low-data" ? "~" : ""}
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Adaptive progress bar during rendering */}
          {isGenerating && (
            <div className="space-y-1 pt-1">
              <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    eta.phase === "queue" ? "bg-amber-500" :
                    eta.phase === "finishing" ? "bg-purple-500" :
                    "bg-emerald-500"
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-stone-600">
                <span>{eta.phase === "queue" ? "Queued..." : eta.phase === "finishing" ? "Finalizing..." : "Generating frames..."}</span>
                <span>{progressPct}%</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
