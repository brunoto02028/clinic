// Unified AI Provider — Gemini only
// All AI calls in the system should go through this layer.

import { getConfigValue } from "@/lib/system-config";

// ─── Types ───

export type AIProvider = "gemini";

export interface AICallOptions {
  provider?: AIProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  jsonMode?: boolean;
}

export interface AIImageOptions {
  provider?: AIProvider;
  model?: string;
  aspectRatio?: string;
  numImages?: number;
  quality?: "auto" | "low" | "medium" | "high";
}

export interface AIVisionOptions {
  provider?: AIProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIStreamOptions {
  provider?: AIProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

// ─── Config helpers ───

async function getGeminiKey(): Promise<string | null> {
  return getConfigValue("GEMINI_API_KEY");
}

async function getGeminiModel(): Promise<string> {
  return (await getConfigValue("GEMINI_MODEL")) || "gemini-2.0-flash";
}

async function getImageModel(): Promise<string> {
  return (await getConfigValue("AI_IMAGE_MODEL")) || "gemini-2.5-flash-image";
}

// ─── Gemini direct call (text generation) ───

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string; inlineData?: { mimeType?: string; data?: string } }>;
    };
  }>;
}

async function callGeminiDirect(
  prompt: string,
  opts: { temperature?: number; maxTokens?: number; systemPrompt?: string }
): Promise<string> {
  const apiKey = await getGeminiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured. Go to Admin → API & AI Settings.");
  const model = await getGeminiModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const contents: any[] = [];
  if (opts.systemPrompt) {
    contents.push({ role: "user", parts: [{ text: opts.systemPrompt }] });
    contents.push({ role: "model", parts: [{ text: "Understood. I will follow these instructions." }] });
  }
  contents.push({ role: "user", parts: [{ text: prompt }] });

  let res: Response | null = null;
  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: opts.temperature ?? 0.8,
          topP: 0.95,
          maxOutputTokens: opts.maxTokens ?? 2048,
        },
      }),
    });
    if (res.status === 429 && attempt < MAX_RETRIES) {
      const waitMs = Math.pow(2, attempt + 1) * 5000;
      console.log(`[ai-provider] Rate limited (429), retrying in ${waitMs / 1000}s...`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }
    break;
  }

  if (!res || !res.ok) {
    const err = res ? await res.text() : "No response";
    if (res?.status === 429) {
      throw new Error("Gemini API quota exceeded. Free tier daily limit reached.");
    }
    throw new Error(`Gemini API error (${res?.status}): ${err}`);
  }

  const data: GeminiResponse = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No response from Gemini");
  return text.trim();
}

// ─── Gemini image generation ───

async function generateImageGemini(
  prompt: string,
  opts: { model?: string; aspectRatio?: string; numImages?: number }
): Promise<string[]> {
  const apiKey = await getGeminiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured for image generation.");

  const model = opts.model || (await getImageModel());
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    let errMsg = `Gemini image generation error (${res.status})`;
    try { errMsg += `: ${JSON.parse(errText).error?.message || errText.slice(0, 200)}`; } catch { errMsg += `: ${errText.slice(0, 200)}`; }
    throw new Error(errMsg);
  }

  const data = await res.json();
  const urls: string[] = [];
  const parts = data.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData?.mimeType?.startsWith("image/")) {
      urls.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
    }
  }
  return urls;
}

// ─── Gemini vision (image analysis) ───

async function analyzeImageGemini(
  imageUrl: string,
  prompt: string,
  opts: { temperature?: number; maxTokens?: number; systemPrompt?: string }
): Promise<string> {
  const apiKey = await getGeminiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
  const model = await getGeminiModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Build parts: system prompt context + image + user prompt
  const parts: any[] = [];
  if (opts.systemPrompt) {
    parts.push({ text: opts.systemPrompt + "\n\n" });
  }

  // Try to fetch image and send as inline data for better analysis
  let imageAdded = false;
  if (imageUrl.startsWith("data:image")) {
    const match = imageUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (match) {
      parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
      imageAdded = true;
    }
  } else if (imageUrl.startsWith("http")) {
    try {
      const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) });
      if (imgRes.ok) {
        const buf = await imgRes.arrayBuffer();
        const mime = imgRes.headers.get("content-type") || "image/jpeg";
        parts.push({ inlineData: { mimeType: mime, data: Buffer.from(buf).toString("base64") } });
        imageAdded = true;
      }
    } catch {
      // Fall through to text-only analysis
    }
  }

  if (!imageAdded) {
    parts.push({ text: `[Image URL: ${imageUrl}]\n\n` });
  }

  parts.push({ text: prompt });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: opts.temperature ?? 0.3,
        maxOutputTokens: opts.maxTokens ?? 4096,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini vision error (${res.status}): ${err}`);
  }

  const data: GeminiResponse = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No response from Gemini vision");
  return text.trim();
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API — Use these functions throughout the system
// ═══════════════════════════════════════════════════════════════

/**
 * Generate text using Gemini.
 */
export async function callAI(prompt: string, opts?: AICallOptions): Promise<string> {
  return callGeminiDirect(prompt, {
    temperature: opts?.temperature,
    maxTokens: opts?.maxTokens,
    systemPrompt: opts?.systemPrompt,
  });
}

/**
 * Generate images using Gemini (gemini-2.5-flash-preview-image-generation by default).
 */
export async function generateImage(prompt: string, opts?: AIImageOptions): Promise<string[]> {
  return generateImageGemini(prompt, {
    model: opts?.model,
    aspectRatio: opts?.aspectRatio,
    numImages: opts?.numImages,
  });
}

/**
 * Analyze an image using Gemini vision capabilities.
 */
export async function analyzeImage(
  imageUrl: string,
  prompt: string,
  opts?: AIVisionOptions & { systemPrompt?: string }
): Promise<string> {
  return analyzeImageGemini(imageUrl, prompt, {
    temperature: opts?.temperature,
    maxTokens: opts?.maxTokens,
    systemPrompt: opts?.systemPrompt,
  });
}

/**
 * Stream AI response. Wraps Gemini full response as a simple stream.
 */
export async function streamAI(prompt: string, opts?: AIStreamOptions): Promise<ReadableStream<Uint8Array>> {
  const text = await callGeminiDirect(prompt, {
    temperature: opts?.temperature,
    maxTokens: opts?.maxTokens,
    systemPrompt: opts?.systemPrompt,
  });
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
}

/**
 * Multi-turn chat using Gemini.
 * messages: array of { role: "user"|"assistant"|"system", content: string }
 */
export async function callAIChat(
  messages: Array<{ role: string; content: string }>,
  opts?: { provider?: AIProvider; model?: string; temperature?: number; maxTokens?: number; systemPrompt?: string }
): Promise<string> {
  const apiKey = await getGeminiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
  const model = opts?.model || (await getGeminiModel());
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const systemInstruction = opts?.systemPrompt
    ? { parts: [{ text: opts.systemPrompt }] }
    : undefined;

  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" || m.role === "model" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const body: any = {
    contents,
    generationConfig: {
      temperature: opts?.temperature ?? 0.7,
      maxOutputTokens: opts?.maxTokens ?? 4096,
    },
  };
  if (systemInstruction) body.systemInstruction = systemInstruction;

  let res: Response | null = null;
  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 429 && attempt < MAX_RETRIES) {
      const waitMs = Math.pow(2, attempt + 1) * 5000;
      console.log(`[ai-provider] Chat rate limited (429), retrying in ${waitMs / 1000}s...`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }
    break;
  }

  if (!res || !res.ok) {
    const err = res ? await res.text() : "No response";
    throw new Error(`Gemini chat error (${res?.status}): ${err}`);
  }

  const data: GeminiResponse = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

/**
 * Parse JSON from AI response text. Handles markdown code blocks and raw JSON.
 */
export function parseAIJson<T = any>(raw: string): T {
  // Strip markdown code fences
  let cleaned = raw.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();

  // Try full parse first
  try {
    return JSON.parse(cleaned);
  } catch {}

  // Try extracting JSON object
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]);
    } catch {}
  }

  // Try extracting JSON array
  const arrMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      return JSON.parse(arrMatch[0]);
    } catch {}
  }

  throw new Error("Failed to parse AI response as JSON");
}

/**
 * Get info about which provider and model is currently active.
 */
export async function getActiveProviderInfo(): Promise<{
  provider: string;
  hasAbacus: boolean;
  hasGemini: boolean;
  defaultProvider: string;
}> {
  const geminiKey = await getGeminiKey();
  return {
    provider: geminiKey ? "gemini" : "none",
    hasAbacus: false,
    hasGemini: !!geminiKey,
    defaultProvider: "gemini",
  };
}
