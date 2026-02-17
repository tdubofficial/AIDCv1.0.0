import type { Character, StoryboardScene } from "~/app/types";
import { CINEMATIC_PRESETS } from "~/app/lib/anthologies";

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

export async function generateStoryboard(
  theme: { title: string; genre: string; synopsis: string; tone: string },
  characters: Character[]
): Promise<StoryboardScene[]> {
  const apiKey = getGeminiKey();
  if (!apiKey) throw new Error("Gemini API key not configured. Add it in Settings.");

  const prompt = `You are a professional film director creating a detailed storyboard.

Film Title: ${theme.title}
Genre: ${theme.genre}
Synopsis: ${theme.synopsis}
Tone: ${theme.tone}

Cast Characters:
${characters.map((c) => `- ${c.name}: ${c.description}`).join("\n")}

Create a detailed storyboard with 6-8 scenes. For each scene provide:
1. Scene number
2. Title (short)
3. Description (1-2 sentences)
4. Camera angle (one of: closeup, medium, wide, dolly, static, aerial, handheld)
5. Characters present (array of names)
6. Key dialog (if any, short)
7. Lighting (one of: noir, golden, neon, natural, dramatic)
8. A detailed image generation prompt optimized for AI video generation (describe visual details, motion, camera work, lighting, atmosphere)

Format as JSON array with fields: sceneNumber, title, description, cameraAngle, characters, dialog, lighting, prompt

Make it cinematic and production-ready. Return ONLY the JSON array, no other text.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error: ${err}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemini");

  // Clean and parse JSON
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  let parsed: any[];

  try {
    const parsedData: any = JSON.parse(cleaned);
    if (Array.isArray(parsedData)) {
      parsed = parsedData;
    } else {
      // Sometimes Gemini wraps in an object
      parsed = parsedData.scenes || parsedData.storyboard || Object.values(parsedData)[0];
    }
    if (!Array.isArray(parsed)) throw new Error("Parsed storyboard is not an array");
  } catch (e) {
    throw new Error("Failed to parse Gemini response as JSON");
  }

  return parsed.map((scene: any, idx: number) => {
    const cameraKey = (scene.cameraAngle || "medium") as keyof typeof CINEMATIC_PRESETS.camera;
    const cameraHint = CINEMATIC_PRESETS.camera[cameraKey] || CINEMATIC_PRESETS.camera.medium;

    return {
      id: `scene-${Date.now()}-${idx}`,
      sceneNumber: scene.sceneNumber || idx + 1,
      title: scene.title || `Scene ${idx + 1}`,
      description: scene.description || "",
      cameraAngle: scene.cameraAngle || "medium",
      characters: Array.isArray(scene.characters) ? scene.characters : [],
      dialog: scene.dialog || "",
      lighting: scene.lighting || "natural",
      duration: 5,
      status: "pending" as const,
      prompt: `${scene.prompt || scene.description}. ${CINEMATIC_PRESETS.style.cinematic}. ${cameraHint}.`,
      order: idx,
    };
  });
}
