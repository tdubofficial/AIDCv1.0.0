import type { VideoGenerationParams } from "~/app/types";
import { CINEMATIC_PRESETS } from "~/app/lib/anthologies";

const FAL_BASE = "https://queue.fal.run";

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

// ============================================================
// KLING via Fal.ai
// ============================================================
export async function generateKling(params: VideoGenerationParams, modelVersion = "v1.6-pro"): Promise<GenerationResult> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Fal.ai API key not configured");

  const enhanced = enhancePrompt(params.prompt, {
    style: params.stylePreset,
    camera: params.cameraMovement,
  });

  const res = await fetch(`${FAL_BASE}/fal-ai/kling-video`, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: enhanced,
      negative_prompt: params.negativePrompt || "blurry, low quality, distorted anatomy, watermark, text",
      image_url: params.imageUrl || undefined,
      duration: Math.min(params.duration, 10),
      aspect_ratio: params.aspectRatio,
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
// MINIMAX via Fal.ai
// ============================================================
export async function generateMinimax(params: VideoGenerationParams): Promise<GenerationResult> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Fal.ai API key not configured");

  // MiniMax prefers concise prompts
  const prompt = params.prompt.replace(/cinematic|high quality|8k|detailed/gi, "").trim() + ", high motion, smooth camera";

  const res = await fetch(`${FAL_BASE}/fal-ai/minimax-video`, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_url: params.imageUrl || undefined,
      duration: Math.min(params.duration, 6),
      aspect_ratio: params.aspectRatio,
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

  const endpoint = params.imageUrl ? "fal-ai/wan-i2v" : "fal-ai/wan-t2v";

  const res = await fetch(`${FAL_BASE}/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_url: params.imageUrl || undefined,
      duration: Math.min(params.duration, 10),
      aspect_ratio: params.aspectRatio,
      seed: params.seed,
    }),
  });

  if (!res.ok) throw new Error(`WAN API error: ${await res.text()}`);
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
    kling: "fal-ai/kling-video",
    minimax: "fal-ai/minimax-video",
    wan: "fal-ai/wan-t2v",
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
  provider: "kling" | "minimax" | "wan" | "auto"
): Promise<GenerationResult> {
  const selected = provider === "auto" ? selectBestProvider(params) : provider;

  switch (selected) {
    case "minimax":
      return generateMinimax(params);
    case "wan":
      return generateWan(params);
    case "kling":
    default:
      return generateKling(params);
  }
}

function selectBestProvider(params: VideoGenerationParams): "kling" | "minimax" | "wan" {
  // Action/motion scenes → WAN
  if (params.prompt.match(/running|action|explosion|fast|dynamic|fight/i)) return "wan";
  // Short / budget clips → MiniMax
  if (params.duration <= 3) return "minimax";
  // Default: Kling (best quality-to-cost)
  return "kling";
}

// ============================================================
// COST ESTIMATES
// ============================================================
export function estimateCost(provider: string, duration: number): number {
  const rates: Record<string, number> = { kling: 0.06, minimax: 0.03, wan: 0.04 };
  return (rates[provider] || 0.06) * duration;
}
