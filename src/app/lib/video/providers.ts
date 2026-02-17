import type { VideoGenerationParams } from "~/app/types";
import { CINEMATIC_PRESETS } from "~/app/lib/anthologies";

const FAL_BASE = "https://queue.fal.run";

// ============================================================
// MODEL CAPABILITIES & RESTRICTIONS
// ============================================================

export interface ModelCapabilities {
  name: string;
  maxDuration: number;
  supportedAspectRatios: string[];
  supportsImageToVideo: boolean;
  supportsNegativePrompt: boolean;
  supportsSeed: boolean;
  supportsCameraMovement: boolean;
  supportsStylePresets: boolean;
  /** Average seconds of real time per second of output video */
  avgSecondsPerOutputSecond: number;
  /** Typical queue wait in seconds before generation begins */
  avgQueueWait: number;
  notes: string[];
}

export type ProviderKey = "kling" | "kling-o1" | "minimax" | "wan" | "omni-human" | "veo2" | "ltx" | "pixverse" | "runway" | "auto";

export const MODEL_CAPABILITIES: Record<string, ModelCapabilities> = {
  kling: {
    name: "Kling 1.6 Pro",
    maxDuration: 10,
    supportedAspectRatios: ["16:9", "9:16", "1:1"],
    supportsImageToVideo: true,
    supportsNegativePrompt: true,
    supportsSeed: true,
    supportsCameraMovement: true,
    supportsStylePresets: true,
    avgSecondsPerOutputSecond: 18,
    avgQueueWait: 15,
    notes: [],
  },
  "kling-o1": {
    name: "Kling O1",
    maxDuration: 10,
    supportedAspectRatios: ["16:9", "9:16", "1:1"],
    supportsImageToVideo: true,
    supportsNegativePrompt: true,
    supportsSeed: true,
    supportsCameraMovement: true,
    supportsStylePresets: true,
    avgSecondsPerOutputSecond: 25,
    avgQueueWait: 20,
    notes: [
      "Highest quality Kling model — slower but superior visual fidelity",
      "Best for hero shots and final renders",
    ],
  },
  minimax: {
    name: "MiniMax",
    maxDuration: 6,
    supportedAspectRatios: ["16:9", "9:16", "1:1"],
    supportsImageToVideo: true,
    supportsNegativePrompt: false,
    supportsSeed: true,
    supportsCameraMovement: false,
    supportsStylePresets: false,
    avgSecondsPerOutputSecond: 12,
    avgQueueWait: 10,
    notes: [
      "Camera movement prompts are ignored",
      "Style presets have limited effect — model favors its own aesthetic",
    ],
  },
  wan: {
    name: "WAN",
    maxDuration: 10,
    supportedAspectRatios: ["16:9", "9:16", "1:1"],
    supportsImageToVideo: true,
    supportsNegativePrompt: false,
    supportsSeed: true,
    supportsCameraMovement: false,
    supportsStylePresets: true,
    avgSecondsPerOutputSecond: 22,
    avgQueueWait: 20,
    notes: [
      "Best for high-motion scenes",
      "Camera movement is baked into prompt, not a separate parameter",
    ],
  },
  "omni-human": {
    name: "Omni Human",
    maxDuration: 10,
    supportedAspectRatios: ["16:9", "9:16", "1:1"],
    supportsImageToVideo: true,
    supportsNegativePrompt: false,
    supportsSeed: true,
    supportsCameraMovement: false,
    supportsStylePresets: false,
    avgSecondsPerOutputSecond: 20,
    avgQueueWait: 15,
    notes: [
      "Specialized for realistic human motion and expressions",
      "Requires a reference image for best results",
      "Best for dialogue scenes and character close-ups",
    ],
  },
  veo2: {
    name: "Google Veo 2",
    maxDuration: 8,
    supportedAspectRatios: ["16:9", "9:16"],
    supportsImageToVideo: true,
    supportsNegativePrompt: false,
    supportsSeed: false,
    supportsCameraMovement: false,
    supportsStylePresets: false,
    avgSecondsPerOutputSecond: 30,
    avgQueueWait: 25,
    notes: [
      "Google DeepMind's flagship video model — exceptional realism",
      "Longer queue times but outstanding visual fidelity",
      "Best for photorealistic and nature scenes",
    ],
  },
  ltx: {
    name: "LTX Video",
    maxDuration: 5,
    supportedAspectRatios: ["16:9", "9:16", "1:1"],
    supportsImageToVideo: true,
    supportsNegativePrompt: true,
    supportsSeed: true,
    supportsCameraMovement: false,
    supportsStylePresets: false,
    avgSecondsPerOutputSecond: 8,
    avgQueueWait: 5,
    notes: [
      "Lightricks' fast video model — fastest generation times",
      "Great for rapid prototyping and iteration",
      "Lower max duration (5s) but very fast turnaround",
    ],
  },
  pixverse: {
    name: "PixVerse v3.5",
    maxDuration: 8,
    supportedAspectRatios: ["16:9", "9:16", "1:1"],
    supportsImageToVideo: true,
    supportsNegativePrompt: true,
    supportsSeed: true,
    supportsCameraMovement: false,
    supportsStylePresets: true,
    avgSecondsPerOutputSecond: 15,
    avgQueueWait: 12,
    notes: [
      "Strong at stylized and animated content",
      "Good balance of speed and quality",
      "Supports style presets for consistent aesthetic",
    ],
  },
  runway: {
    name: "Runway Gen-3 Turbo",
    maxDuration: 10,
    supportedAspectRatios: ["16:9", "9:16"],
    supportsImageToVideo: true,
    supportsNegativePrompt: false,
    supportsSeed: true,
    supportsCameraMovement: false,
    supportsStylePresets: false,
    avgSecondsPerOutputSecond: 20,
    avgQueueWait: 15,
    notes: [
      "Runway's flagship model — industry-standard quality",
      "Excels at image-to-video with strong reference fidelity",
      "Best results when a reference image is provided",
    ],
  },
};

/** Check what features are unsupported for the active provider + visual preset */
export function getRestrictionWarnings(
  provider: string,
  visualPreset: { style: string; lighting: string; camera: string; aspectRatio: string },
  sceneDuration: number
): string[] {
  const caps = MODEL_CAPABILITIES[provider];
  if (!caps) return [];
  const warnings: string[] = [];

  if (sceneDuration > caps.maxDuration) {
    warnings.push(`Duration ${sceneDuration}s exceeds max ${caps.maxDuration}s — will be clamped`);
  }
  if (!caps.supportedAspectRatios.includes(visualPreset.aspectRatio)) {
    warnings.push(`Aspect ratio ${visualPreset.aspectRatio} not supported — will fall back to 16:9`);
  }
  if (!caps.supportsCameraMovement && visualPreset.camera !== "static" && visualPreset.camera !== "medium") {
    warnings.push(`Camera movement "${visualPreset.camera}" ignored by ${caps.name}`);
  }
  if (!caps.supportsStylePresets && visualPreset.style !== "cinematic") {
    warnings.push(`Style "${visualPreset.style}" has limited effect on ${caps.name}`);
  }
  if (!caps.supportsNegativePrompt) {
    warnings.push(`Negative prompts not supported by ${caps.name}`);
  }
  return warnings;
}

/** Estimate total render time in seconds for a given provider + output duration.
 *
 *  The "smart" version accounts for:
 *    1. Historical averages per provider (exponential-weighted towards recent renders)
 *    2. Image-to-video overhead (reference image adds ~35% processing time)
 *    3. Prompt complexity (longer prompts → slightly longer generation)
 *    4. Aspect ratio modifiers (portrait/square marginally different from landscape)
 *
 *  When no history is available it falls back to static model-capability constants.
 */
export interface RenderEstimateContext {
  /** Whether a reference image will be supplied */
  hasImage?: boolean;
  /** Length of the final prompt in characters */
  promptLength?: number;
  /** Aspect ratio being requested */
  aspectRatio?: string;
  /** Historical render timing records (pass from store) */
  history?: { provider: string; outputDuration: number; actualSeconds: number; hadImage: boolean; promptLength: number; aspectRatio: string; timestamp: number }[];
}

export function estimateRenderSeconds(
  provider: string,
  outputDuration: number,
  ctx?: RenderEstimateContext,
): number {
  const caps = MODEL_CAPABILITIES[provider] || MODEL_CAPABILITIES.kling;

  // ---------- Static baseline ----------
  let baseline = caps.avgQueueWait + outputDuration * caps.avgSecondsPerOutputSecond;

  // ---------- Complexity modifiers ----------
  // Image-to-video adds overhead (encoding + conditioning)
  if (ctx?.hasImage) baseline *= 1.35;

  // Longer prompts → slightly longer CLIP encoding / attention
  if (ctx?.promptLength && ctx.promptLength > 300) {
    baseline *= 1 + Math.min((ctx.promptLength - 300) / 3000, 0.15); // up to +15%
  }

  // Non-landscape aspect ratios have marginal overhead on some models
  if (ctx?.aspectRatio === "9:16") baseline *= 1.05;
  if (ctx?.aspectRatio === "1:1") baseline *= 1.02;

  // ---------- Adaptive: blend with historical data ----------
  if (ctx?.history && ctx.history.length > 0) {
    // Filter to relevant provider records from the last 7 days
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const relevant = ctx.history.filter(
      (r) => r.provider === provider && r.timestamp > cutoff,
    );

    if (relevant.length >= 2) {
      // Compute exponential-weighted moving average (λ = 0.3 → recent renders weigh more)
      const lambda = 0.3;
      // Normalise each record to "seconds per output second" so we can compare across durations
      const rates = relevant.map((r) => ({
        rate: r.actualSeconds / Math.max(r.outputDuration, 1),
        ts: r.timestamp,
      }));
      // Sort oldest → newest so the last element is the most recent
      rates.sort((a, b) => a.ts - b.ts);

      let ewma = rates[0].rate;
      for (let i = 1; i < rates.length; i++) {
        ewma = lambda * rates[i].rate + (1 - lambda) * ewma;
      }

      // Reconstruct estimate from learned rate
      let adaptive = ewma * outputDuration;

      // Re-apply modifiers that aren't already baked into historical data
      if (ctx.hasImage) {
        const histImageRatio = relevant.filter((r) => r.hadImage).length / relevant.length;
        // Only add the image overhead if most of our history was text-to-video
        if (histImageRatio < 0.5) adaptive *= 1.2;
      }

      // Blend: 70% adaptive, 30% static (safety net for outlier history)
      baseline = Math.round(0.7 * adaptive + 0.3 * baseline);
    }
  }

  return Math.max(5, Math.round(baseline));
}

/** Describe the confidence level of the estimate */
export function estimateConfidence(
  provider: string,
  history?: { provider: string; timestamp: number }[],
): "learned" | "low-data" | "static" {
  if (!history || history.length === 0) return "static";
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const relevant = history.filter((r) => r.provider === provider && r.timestamp > cutoff);
  if (relevant.length >= 5) return "learned";
  if (relevant.length >= 2) return "low-data";
  return "static";
}

/** Format seconds into a human-friendly string (e.g. "2m 30s" or "45s") */
export function formatRenderTime(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

interface GenerationResult {
  jobId: string;
  status: string;
  videoUrl?: string;
  error?: string;
}

function getApiKey(): string {
  try {
    const stored = localStorage.getItem("ai-director-storage");
    if (stored) {
      const data = JSON.parse(stored);
      return data?.state?.apiKeys?.fal || "";
    }
  } catch {}
  return "";
}

function enhancePrompt(base: string, preset?: { style?: string; lighting?: string; camera?: string }): string {
  const parts = [base];
  if (preset?.style && CINEMATIC_PRESETS.style[preset.style as keyof typeof CINEMATIC_PRESETS.style]) {
    parts.push(CINEMATIC_PRESETS.style[preset.style as keyof typeof CINEMATIC_PRESETS.style]);
  }
  if (preset?.lighting && CINEMATIC_PRESETS.lighting[preset.lighting as keyof typeof CINEMATIC_PRESETS.lighting]) {
    parts.push(CINEMATIC_PRESETS.lighting[preset.lighting as keyof typeof CINEMATIC_PRESETS.lighting]);
  }
  if (preset?.camera && CINEMATIC_PRESETS.camera[preset.camera as keyof typeof CINEMATIC_PRESETS.camera]) {
    parts.push(CINEMATIC_PRESETS.camera[preset.camera as keyof typeof CINEMATIC_PRESETS.camera]);
  }
  return parts.join(". ") + ". High quality, detailed textures.";
}

/** Convert aspect ratio like "16:9" to the format required by each Fal.ai endpoint */
function toFalAspectRatio(ar: string, provider: string): string {
  // Fal.ai endpoints accept the colon format: "16:9", "9:16", "1:1"
  // But some older endpoints may need alternate formats — normalize here
  const valid = ["16:9", "9:16", "1:1"];
  if (valid.includes(ar)) return ar;
  // Fallback
  return "16:9";
}

// ============================================================
// KLING via Fal.ai (1.6 Pro)
// ============================================================
export async function generateKling(params: VideoGenerationParams, modelVersion = "v1.6-pro"): Promise<GenerationResult> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Fal.ai API key not configured");

  const enhanced = enhancePrompt(params.prompt, {
    style: params.stylePreset,
    camera: params.cameraMovement,
  });

  const ar = toFalAspectRatio(params.aspectRatio, "kling");

  const res = await fetch(`${FAL_BASE}/fal-ai/kling-video/v1.6/pro/text-to-video`, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: enhanced,
      negative_prompt: params.negativePrompt || "blurry, low quality, distorted anatomy, watermark, text",
      ...(params.imageUrl ? { image_url: params.imageUrl } : {}),
      duration: String(Math.min(params.duration, 10)),
      aspect_ratio: ar,
      cfg_scale: 0.5,
      seed: params.seed || Math.floor(Math.random() * 1000000),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Kling API error: ${err}`);
  }

  const data = await res.json();
  return {
    jobId: data.request_id,
    status: "pending",
  };
}

// ============================================================
// KLING O1 via Fal.ai
// ============================================================
export async function generateKlingO1(params: VideoGenerationParams): Promise<GenerationResult> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Fal.ai API key not configured");

  const enhanced = enhancePrompt(params.prompt, {
    style: params.stylePreset,
    camera: params.cameraMovement,
  });

  const ar = toFalAspectRatio(params.aspectRatio, "kling-o1");

  const res = await fetch(`${FAL_BASE}/fal-ai/kling-video/v2.1/master/text-to-video`, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: enhanced,
      negative_prompt: params.negativePrompt || "blurry, low quality, distorted anatomy, watermark, text",
      ...(params.imageUrl ? { image_url: params.imageUrl } : {}),
      duration: String(Math.min(params.duration, 10)),
      aspect_ratio: ar,
      cfg_scale: 0.5,
      seed: params.seed || Math.floor(Math.random() * 1000000),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Kling O1 API error: ${err}`);
  }

  const data = await res.json();
  return { jobId: data.request_id, status: "pending" };
}

// ============================================================
// MINIMAX via Fal.ai
// ============================================================
export async function generateMinimax(params: VideoGenerationParams): Promise<GenerationResult> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Fal.ai API key not configured");

  // MiniMax prefers concise prompts
  const prompt = params.prompt.replace(/cinematic|high quality|8k|detailed/gi, "").trim() + ", high motion, smooth camera";
  const ar = toFalAspectRatio(params.aspectRatio, "minimax");

  const res = await fetch(`${FAL_BASE}/fal-ai/minimax-video`, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      ...(params.imageUrl ? { image_url: params.imageUrl } : {}),
      duration: Math.min(params.duration, 6),
      aspect_ratio: ar,
      seed: params.seed,
    }),
  });

  if (!res.ok) throw new Error(`MiniMax API error: ${await res.text()}`);
  const data = await res.json();
  return { jobId: data.request_id, status: "pending" };
}

// ============================================================
// WAN via Fal.ai
// ============================================================
export async function generateWan(params: VideoGenerationParams): Promise<GenerationResult> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Fal.ai API key not configured");

  const prompt = params.prompt.includes("motion")
    ? params.prompt
    : `${params.prompt}, dynamic motion, fluid movement, physics-based animation`;

  const endpoint = params.imageUrl ? "fal-ai/wan/v2.1/image-to-video" : "fal-ai/wan/v2.1/text-to-video";
  const ar = toFalAspectRatio(params.aspectRatio, "wan");

  const res = await fetch(`${FAL_BASE}/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      ...(params.imageUrl ? { image_url: params.imageUrl } : {}),
      duration: Math.min(params.duration, 10),
      aspect_ratio: ar,
      seed: params.seed,
    }),
  });

  if (!res.ok) throw new Error(`WAN API error: ${await res.text()}`);
  const data = await res.json();
  return { jobId: data.request_id, status: "pending" };
}

// ============================================================
// OMNI HUMAN via Fal.ai
// ============================================================
export async function generateOmniHuman(params: VideoGenerationParams): Promise<GenerationResult> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Fal.ai API key not configured");

  if (!params.imageUrl) {
    throw new Error("Omni Human requires a reference image. Add a character photo first.");
  }

  const ar = toFalAspectRatio(params.aspectRatio, "omni-human");

  const res = await fetch(`${FAL_BASE}/fal-ai/omnihuman-v1`, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image_url: params.imageUrl,
      prompt: params.prompt,
      aspect_ratio: ar,
      duration: Math.min(params.duration, 10),
      seed: params.seed,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Omni Human API error: ${err}`);
  }

  const data = await res.json();
  return { jobId: data.request_id, status: "pending" };
}

// ============================================================
// GOOGLE VEO 2 via Fal.ai
// ============================================================
export async function generateVeo2(params: VideoGenerationParams): Promise<GenerationResult> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Fal.ai API key not configured");

  const enhanced = enhancePrompt(params.prompt, {
    style: params.stylePreset,
    camera: params.cameraMovement,
  });

  const ar = toFalAspectRatio(params.aspectRatio, "veo2");

  const endpoint = params.imageUrl ? "fal-ai/veo2/image-to-video" : "fal-ai/veo2";

  const res = await fetch(`${FAL_BASE}/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: enhanced,
      ...(params.imageUrl ? { image_url: params.imageUrl } : {}),
      duration: Math.min(params.duration, 8),
      aspect_ratio: ar,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Veo 2 API error: ${err}`);
  }

  const data = await res.json();
  return { jobId: data.request_id, status: "pending" };
}

// ============================================================
// LTX VIDEO via Fal.ai
// ============================================================
export async function generateLtx(params: VideoGenerationParams): Promise<GenerationResult> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Fal.ai API key not configured");

  const enhanced = enhancePrompt(params.prompt, {
    style: params.stylePreset,
    camera: params.cameraMovement,
  });

  const ar = toFalAspectRatio(params.aspectRatio, "ltx");

  const endpoint = params.imageUrl ? "fal-ai/ltx-video/image-to-video" : "fal-ai/ltx-video";

  const res = await fetch(`${FAL_BASE}/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: enhanced,
      negative_prompt: params.negativePrompt || "blurry, low quality, distorted anatomy, watermark, text",
      ...(params.imageUrl ? { image_url: params.imageUrl } : {}),
      num_frames: Math.min(params.duration * 24, 120), // 24fps, max 5s = 120 frames
      aspect_ratio: ar,
      seed: params.seed || Math.floor(Math.random() * 1000000),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LTX Video API error: ${err}`);
  }

  const data = await res.json();
  return { jobId: data.request_id, status: "pending" };
}

// ============================================================
// PIXVERSE via Fal.ai
// ============================================================
export async function generatePixVerse(params: VideoGenerationParams): Promise<GenerationResult> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Fal.ai API key not configured");

  const enhanced = enhancePrompt(params.prompt, {
    style: params.stylePreset,
    camera: params.cameraMovement,
  });

  const ar = toFalAspectRatio(params.aspectRatio, "pixverse");

  const endpoint = params.imageUrl ? "fal-ai/pixverse/v3.5/image-to-video" : "fal-ai/pixverse/v3.5/text-to-video";

  const res = await fetch(`${FAL_BASE}/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: enhanced,
      negative_prompt: params.negativePrompt || "blurry, low quality, distorted anatomy, watermark, text",
      ...(params.imageUrl ? { image_url: params.imageUrl } : {}),
      duration: Math.min(params.duration, 8),
      aspect_ratio: ar,
      seed: params.seed || Math.floor(Math.random() * 1000000),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PixVerse API error: ${err}`);
  }

  const data = await res.json();
  return { jobId: data.request_id, status: "pending" };
}

// ============================================================
// RUNWAY GEN-3 TURBO via Fal.ai
// ============================================================
export async function generateRunway(params: VideoGenerationParams): Promise<GenerationResult> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Fal.ai API key not configured");

  const enhanced = enhancePrompt(params.prompt, {
    style: params.stylePreset,
    camera: params.cameraMovement,
  });

  const ar = toFalAspectRatio(params.aspectRatio, "runway");

  const endpoint = params.imageUrl
    ? "fal-ai/runway-gen3/turbo/image-to-video"
    : "fal-ai/runway-gen3/turbo/text-to-video";

  const res = await fetch(`${FAL_BASE}/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: enhanced,
      ...(params.imageUrl ? { image_url: params.imageUrl } : {}),
      duration: Math.min(params.duration, 10),
      aspect_ratio: ar,
      seed: params.seed || Math.floor(Math.random() * 1000000),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Runway Gen-3 API error: ${err}`);
  }

  const data = await res.json();
  return { jobId: data.request_id, status: "pending" };
}

// ============================================================
// STATUS POLLING
// ============================================================
export async function checkJobStatus(provider: string, jobId: string): Promise<GenerationResult> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Fal.ai API key not configured");

  const endpointMap: Record<string, string> = {
    kling: "fal-ai/kling-video/v1.6/pro/text-to-video",
    "kling-o1": "fal-ai/kling-video/v2.1/master/text-to-video",
    minimax: "fal-ai/minimax-video",
    wan: "fal-ai/wan/v2.1/text-to-video",
    "omni-human": "fal-ai/omnihuman-v1",
    veo2: "fal-ai/veo2",
    ltx: "fal-ai/ltx-video",
    pixverse: "fal-ai/pixverse/v3.5/text-to-video",
    runway: "fal-ai/runway-gen3/turbo/text-to-video",
  };

  const endpoint = endpointMap[provider] || endpointMap.kling;

  const res = await fetch(`https://queue.fal.run/${endpoint}/requests/${jobId}/status`, {
    headers: { Authorization: `Key ${apiKey}` },
  });

  if (!res.ok) throw new Error("Status check failed");
  const data = await res.json();

  if (data.status === "COMPLETED") {
    // Fetch result
    const resultRes = await fetch(`https://queue.fal.run/${endpoint}/requests/${jobId}`, {
      headers: { Authorization: `Key ${apiKey}` },
    });
    const result = await resultRes.json();
    return {
      jobId,
      status: "completed",
      videoUrl: result?.video?.url || result?.output?.video?.url,
    };
  }

  if (data.status === "FAILED") {
    return { jobId, status: "failed", error: data.error || "Generation failed" };
  }

  return { jobId, status: "generating" };
}

// ============================================================
// SMART ROUTER
// ============================================================
export async function generateVideo(
  params: VideoGenerationParams,
  provider: ProviderKey
): Promise<GenerationResult> {
  const selected = provider === "auto" ? selectBestProvider(params) : provider;

  switch (selected) {
    case "minimax":
      return generateMinimax(params);
    case "wan":
      return generateWan(params);
    case "kling-o1":
      return generateKlingO1(params);
    case "omni-human":
      return generateOmniHuman(params);
    case "veo2":
      return generateVeo2(params);
    case "ltx":
      return generateLtx(params);
    case "pixverse":
      return generatePixVerse(params);
    case "runway":
      return generateRunway(params);
    case "kling":
    default:
      return generateKling(params);
  }
}

function selectBestProvider(params: VideoGenerationParams): Exclude<ProviderKey, "auto"> {
  // Action/motion scenes → WAN
  if (params.prompt.match(/running|action|explosion|fast|dynamic|fight/i)) return "wan";
  // Short / budget clips → LTX (fastest) or MiniMax
  if (params.duration <= 3) return "ltx";
  if (params.duration <= 5) return "minimax";
  // Photorealistic scenery → Veo 2
  if (params.prompt.match(/landscape|nature|photorealistic|documentary|aerial/i)) return "veo2";
  // Character close-ups with reference image → Omni Human
  if (params.imageUrl && params.prompt.match(/person|face|portrait|dialogue|close-up/i)) return "omni-human";
  // Default: Kling (best quality-to-cost)
  return "kling";
}

// ============================================================
// COST ESTIMATES
// ============================================================
export function estimateCost(provider: string, duration: number): number {
  const rates: Record<string, number> = {
    kling: 0.06,
    "kling-o1": 0.10,
    minimax: 0.03,
    wan: 0.04,
    "omni-human": 0.08,
    veo2: 0.10,
    ltx: 0.02,
    pixverse: 0.05,
    runway: 0.10,
  };
  return (rates[provider] || 0.06) * duration;
}
