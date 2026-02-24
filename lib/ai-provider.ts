// Unified AI Provider — supports Gemini (direct) and Abacus AI RouteLLM (OpenAI-compatible)
// All AI calls in the system should go through this layer.

import { getConfigValue } from "@/lib/system-config";

// ─── Types ───

export type AIProvider = "abacus" | "gemini" | "auto";

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

async function getAbacusKey(): Promise<string | null> {
  return getConfigValue("ABACUS_API_KEY");
}

async function getGeminiKey(): Promise<string | null> {
  return getConfigValue("GEMINI_API_KEY");
}

async function getDefaultProvider(): Promise<AIProvider> {
  const pref = await getConfigValue("AI_DEFAULT_PROVIDER");
  if (pref === "abacus" || pref === "gemini") return pref;
  return "auto";
}

async function getGeminiModel(): Promise<string> {
  return (await getConfigValue("GEMINI_MODEL")) || "gemini-2.0-flash";
}

const ABACUS_BASE_URL = "https://routellm.abacus.ai/v1";

// ─── Provider resolution ───

async function resolveProvider(requested?: AIProvider): Promise<"abacus" | "gemini"> {
  const pref = requested || (await getDefaultProvider());

  if (pref === "abacus") {
    const key = await getAbacusKey();
    if (key) return "abacus";
    // Fallback to Gemini
    const gKey = await getGeminiKey();
    if (gKey) {
      console.warn("[ai-provider] Abacus key missing, falling back to Gemini");
      return "gemini";
    }
    throw new Error("No AI API keys configured. Go to Admin → API & AI Settings to set up Abacus or Gemini.");
  }

  if (pref === "gemini") {
    const key = await getGeminiKey();
    if (key) return "gemini";
    // Fallback to Abacus
    const aKey = await getAbacusKey();
    if (aKey) {
      console.warn("[ai-provider] Gemini key missing, falling back to Abacus");
      return "abacus";
    }
    throw new Error("No AI API keys configured. Go to Admin → API & AI Settings to set up Abacus or Gemini.");
  }

  // "auto" — prefer Abacus, fallback to Gemini
  const abacusKey = await getAbacusKey();
  if (abacusKey) return "abacus";
  const geminiKey = await getGeminiKey();
  if (geminiKey) return "gemini";
  throw new Error("No AI API keys configured. Go to Admin → API & AI Settings to set up Abacus or Gemini.");
}

// ─── Gemini direct call ───

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

async function callGeminiDirect(
  prompt: string,
  opts: { temperature?: number; maxTokens?: number; systemPrompt?: string }
): Promise<string> {
  const apiKey = await getGeminiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
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
      console.log(`[ai-provider/gemini] Rate limited (429), retrying in ${waitMs / 1000}s...`);
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

// ─── Abacus (OpenAI-compatible) call ───

interface AbacusChoice {
  message?: { content?: string; role?: string };
  delta?: { content?: string };
}

interface AbacusResponse {
  choices?: AbacusChoice[];
  error?: { message?: string };
}

async function callAbacusDirect(
  prompt: string,
  opts: { temperature?: number; maxTokens?: number; systemPrompt?: string; model?: string; jsonMode?: boolean }
): Promise<string> {
  const apiKey = await getAbacusKey();
  if (!apiKey) throw new Error("ABACUS_API_KEY is not configured.");

  const model = opts.model || "route-llm";
  const messages: Array<{ role: string; content: string }> = [];

  if (opts.systemPrompt) {
    messages.push({ role: "system", content: opts.systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const body: any = {
    model,
    messages,
    temperature: opts.temperature ?? 0.8,
    max_tokens: opts.maxTokens ?? 2048,
  };

  if (opts.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  let res: Response | null = null;
  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    res = await fetch(`${ABACUS_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (res.status === 429 && attempt < MAX_RETRIES) {
      const waitMs = Math.pow(2, attempt + 1) * 3000;
      console.log(`[ai-provider/abacus] Rate limited (429), retrying in ${waitMs / 1000}s...`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }
    break;
  }

  if (!res || !res.ok) {
    const err = res ? await res.text() : "No response";
    throw new Error(`Abacus API error (${res?.status}): ${err}`);
  }

  const data: AbacusResponse = await res.json();
  if (data.error) throw new Error(`Abacus API error: ${data.error.message}`);
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("No response from Abacus AI");
  return text.trim();
}

// ─── Abacus image generation ───

async function generateImageAbacus(
  prompt: string,
  opts: { model?: string; aspectRatio?: string; numImages?: number }
): Promise<string[]> {
  const apiKey = await getAbacusKey();
  if (!apiKey) throw new Error("ABACUS_API_KEY is not configured.");

  const model = opts.model || "flux-2-pro";

  const body: any = {
    model,
    messages: [{ role: "user", content: prompt }],
    modalities: ["image"],
    image_config: {
      num_images: opts.numImages || 1,
      aspect_ratio: opts.aspectRatio || "16:9",
    },
  };

  const res = await fetch(`${ABACUS_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Abacus image generation error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const urls: string[] = [];

  // Extract image URLs from the response
  for (const choice of data.choices || []) {
    // Abacus FLUX/image models return images in message.images[] array
    const images = choice.message?.images;
    if (Array.isArray(images)) {
      for (const img of images) {
        const imgUrl = img?.image_url?.url || img?.url;
        if (imgUrl) urls.push(imgUrl);
      }
    }

    // Also check message.content for URLs or data URIs (some models)
    const content = choice.message?.content;
    if (content && typeof content === "string" && content.length > 0) {
      if (content.startsWith("http") || content.startsWith("data:image")) {
        urls.push(content);
      } else {
        const urlMatch = content.match(/https?:\/\/[^\s)]+/);
        if (urlMatch) urls.push(urlMatch[0]);
      }
    }
  }

  return urls;
}

// ─── Abacus vision (image analysis) ───

async function analyzeImageAbacus(
  imageUrl: string,
  prompt: string,
  opts: { model?: string; temperature?: number; maxTokens?: number; systemPrompt?: string }
): Promise<string> {
  const apiKey = await getAbacusKey();
  if (!apiKey) throw new Error("ABACUS_API_KEY is not configured.");

  const model = opts.model || "route-llm";
  const messages: any[] = [];

  if (opts.systemPrompt) {
    messages.push({ role: "system", content: opts.systemPrompt });
  }

  messages.push({
    role: "user",
    content: [
      { type: "text", text: prompt },
      { type: "image_url", image_url: { url: imageUrl } },
    ],
  });

  const res = await fetch(`${ABACUS_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 4096,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Abacus vision error (${res.status}): ${err}`);
  }

  const data: AbacusResponse = await res.json();
  if (data.error) throw new Error(`Abacus vision error: ${data.error.message}`);
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("No response from Abacus vision");
  return text.trim();
}

// ─── Abacus streaming ───

async function streamAbacus(
  prompt: string,
  opts: { model?: string; temperature?: number; maxTokens?: number; systemPrompt?: string }
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = await getAbacusKey();
  if (!apiKey) throw new Error("ABACUS_API_KEY is not configured.");

  const model = opts.model || "route-llm";
  const messages: Array<{ role: string; content: string }> = [];

  if (opts.systemPrompt) {
    messages.push({ role: "system", content: opts.systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const res = await fetch(`${ABACUS_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts.temperature ?? 0.8,
      max_tokens: opts.maxTokens ?? 2048,
      stream: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Abacus streaming error (${res.status}): ${err}`);
  }

  if (!res.body) throw new Error("No stream body from Abacus");
  return res.body;
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API — Use these functions throughout the system
// ═══════════════════════════════════════════════════════════════

/**
 * Generate text using the best available AI provider.
 * This is the primary function to replace all direct callGemini calls.
 */
export async function callAI(prompt: string, opts?: AICallOptions): Promise<string> {
  const provider = await resolveProvider(opts?.provider);

  if (provider === "abacus") {
    try {
      return await callAbacusDirect(prompt, {
        temperature: opts?.temperature,
        maxTokens: opts?.maxTokens,
        systemPrompt: opts?.systemPrompt,
        model: opts?.model,
        jsonMode: opts?.jsonMode,
      });
    } catch (err: any) {
      console.warn("[ai-provider] Abacus failed, trying Gemini fallback:", err.message);
      const geminiKey = await getGeminiKey();
      if (geminiKey) {
        return callGeminiDirect(prompt, {
          temperature: opts?.temperature,
          maxTokens: opts?.maxTokens,
          systemPrompt: opts?.systemPrompt,
        });
      }
      throw err;
    }
  }

  // Gemini provider
  try {
    return await callGeminiDirect(prompt, {
      temperature: opts?.temperature,
      maxTokens: opts?.maxTokens,
      systemPrompt: opts?.systemPrompt,
    });
  } catch (err: any) {
    console.warn("[ai-provider] Gemini failed, trying Abacus fallback:", err.message);
    const abacusKey = await getAbacusKey();
    if (abacusKey) {
      return callAbacusDirect(prompt, {
        temperature: opts?.temperature,
        maxTokens: opts?.maxTokens,
        systemPrompt: opts?.systemPrompt,
        model: opts?.model,
        jsonMode: opts?.jsonMode,
      });
    }
    throw err;
  }
}

/**
 * Generate images using AI. Prefers Abacus (FLUX-2 PRO) for quality.
 * Falls back to Gemini image generation if Abacus is unavailable.
 */
export async function generateImage(prompt: string, opts?: AIImageOptions): Promise<string[]> {
  const provider = await resolveProvider(opts?.provider);

  if (provider === "abacus") {
    try {
      return await generateImageAbacus(prompt, {
        model: opts?.model,
        aspectRatio: opts?.aspectRatio,
        numImages: opts?.numImages,
      });
    } catch (err: any) {
      console.warn("[ai-provider] Abacus image gen failed:", err.message);
      // Gemini image fallback via Imagen through Abacus or skip
      throw err;
    }
  }

  // Gemini image generation via generateContent with IMAGE modality
  const apiKey = await getGeminiKey();
  if (!apiKey) throw new Error("No AI API key configured for image generation.");

  const model = "gemini-2.0-flash";
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
    const err = await res.text();
    throw new Error(`Gemini image generation error (${res.status}): ${err}`);
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

/**
 * Analyze an image using AI vision capabilities.
 * Best with Abacus (GPT-5 Vision / Claude Vision).
 */
export async function analyzeImage(
  imageUrl: string,
  prompt: string,
  opts?: AIVisionOptions & { systemPrompt?: string }
): Promise<string> {
  const provider = await resolveProvider(opts?.provider);

  if (provider === "abacus") {
    return analyzeImageAbacus(imageUrl, prompt, {
      model: opts?.model,
      temperature: opts?.temperature,
      maxTokens: opts?.maxTokens,
      systemPrompt: opts?.systemPrompt,
    });
  }

  // Gemini vision fallback — send image URL as inline data
  const fullPrompt = opts?.systemPrompt
    ? `${opts.systemPrompt}\n\nImage URL: ${imageUrl}\n\n${prompt}`
    : `Analyze this image: ${imageUrl}\n\n${prompt}`;

  return callGeminiDirect(fullPrompt, {
    temperature: opts?.temperature,
    maxTokens: opts?.maxTokens,
  });
}

/**
 * Stream AI response (only available with Abacus).
 * Returns a ReadableStream for SSE streaming to the client.
 */
export async function streamAI(prompt: string, opts?: AIStreamOptions): Promise<ReadableStream<Uint8Array>> {
  const abacusKey = await getAbacusKey();
  if (abacusKey) {
    return streamAbacus(prompt, {
      model: opts?.model,
      temperature: opts?.temperature,
      maxTokens: opts?.maxTokens,
      systemPrompt: opts?.systemPrompt,
    });
  }
  // No streaming for Gemini — return a simple stream wrapping the full response
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
 * Multi-turn chat using the best available AI provider.
 * messages: array of { role: "user"|"assistant"|"system", content: string }
 */
export async function callAIChat(
  messages: Array<{ role: string; content: string }>,
  opts?: { provider?: AIProvider; model?: string; temperature?: number; maxTokens?: number; systemPrompt?: string }
): Promise<string> {
  const provider = await resolveProvider(opts?.provider);

  if (provider === "abacus") {
    const apiKey = await getAbacusKey();
    if (!apiKey) throw new Error("ABACUS_API_KEY is not configured.");

    const model = opts?.model || "route-llm";
    const abacusMessages: Array<{ role: string; content: string }> = [];

    if (opts?.systemPrompt) {
      abacusMessages.push({ role: "system", content: opts.systemPrompt });
    }

    for (const m of messages) {
      abacusMessages.push({
        role: m.role === "model" ? "assistant" : m.role === "assistant" ? "assistant" : m.role === "system" ? "system" : "user",
        content: m.content,
      });
    }

    const res = await fetch(`${ABACUS_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: abacusMessages,
        temperature: opts?.temperature ?? 0.7,
        max_tokens: opts?.maxTokens ?? 4096,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Abacus chat error (${res.status}): ${err}`);
    }

    const data: AbacusResponse = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || "";
  }

  // Gemini provider — convert to Gemini multi-turn format
  const apiKey = await getGeminiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
  const model = await getGeminiModel();
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

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini chat error (${res.status}): ${err}`);
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
  const [abacusKey, geminiKey, defaultProv] = await Promise.all([
    getAbacusKey(),
    getGeminiKey(),
    getDefaultProvider(),
  ]);
  return {
    provider: abacusKey ? "abacus" : geminiKey ? "gemini" : "none",
    hasAbacus: !!abacusKey,
    hasGemini: !!geminiKey,
    defaultProvider: defaultProv,
  };
}
