// Unified AI Provider — Minimax M3 (primary), Groq llama-3.3-70b (secondary), Gemini 2.5-flash (fallback)
// Claude Sonnet 5 via OpenRouter for high-quality clinical/study/marketing tasks (lib/claude.ts)
// All AI calls in the system should go through this layer.

import { getConfigValue } from "@/lib/system-config";
import { claudeGenerate, claudeGenerateWithFallback, claudeVision, AI_STRICT_MODE } from "@/lib/claude";

// ─── Claude sentinel — import this constant to route callAI/callAIChat through Claude Sonnet 5 ───
// When OPENROUTER_API_KEY is set → uses claude-sonnet-5 via OpenRouter
// Otherwise → uses claude-sonnet-4-20250514 via direct Anthropic API
export const CLAUDE_SONNET_MODEL = 'claude-sonnet';

// ─── Types ───

export type AIProvider = "groq" | "minimax" | "gemini" | "openai";

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

async function getMinimaxKey(): Promise<string | null> {
  return getConfigValue("MINIMAX_API_KEY");
}

async function getGeminiKey(): Promise<string | null> {
  return getConfigValue("GEMINI_API_KEY");
}

async function getGroqKey(): Promise<string | null> {
  return (await getConfigValue("GROQ_API_KEY")) || process.env.GROQ_API_KEY || null;
}

async function getOpenAIKey(): Promise<string | null> {
  return getConfigValue("OPENAI_API_KEY");
}

async function getOpenRouterKey(): Promise<string | null> {
  return getConfigValue("OPENROUTER_API_KEY");
}

async function getGeminiModel(): Promise<string> {
  return (await getConfigValue("GEMINI_MODEL")) || "gemini-2.5-flash";
}

async function getImageModel(): Promise<string> {
  // gemini-2.5-flash-preview-image-generation = Gemini native image gen
  // For higher quality: gemini-3-pro-image-preview (via OpenRouter)
  return (await getConfigValue("AI_IMAGE_MODEL")) || "gemini-2.5-flash-preview-image-generation";
}

// ─── Groq AI calls ───

async function callGroqDirect(
  prompt: string,
  opts: { temperature?: number; maxTokens?: number; systemPrompt?: string }
): Promise<string> {
  const apiKey = await getGroqKey();
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured.");

  const messages: any[] = [];
  if (opts.systemPrompt) {
    messages.push({ role: "system", content: opts.systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 4096,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("No response from Groq");
  return text.trim();
}

async function callGroqChat(
  messages: Array<{ role: string; content: string }>,
  opts: { temperature?: number; maxTokens?: number; systemPrompt?: string }
): Promise<string> {
  const apiKey = await getGroqKey();
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured.");

  const apiMessages: any[] = [];
  if (opts.systemPrompt) {
    apiMessages.push({ role: "system", content: opts.systemPrompt });
  }
  for (const m of messages) {
    if (m.role === "system" && opts.systemPrompt) continue;
    apiMessages.push({
      role: m.role === "model" ? "assistant" : m.role,
      content: m.content,
    });
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: apiMessages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 4096,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq chat error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

// ─── Minimax AI calls ───

async function callMinimaxDirect(
  prompt: string,
  opts: { temperature?: number; maxTokens?: number; systemPrompt?: string }
): Promise<string> {
  const apiKey = await getMinimaxKey();
  if (!apiKey) throw new Error("MINIMAX_API_KEY is not configured.");
  
  const url = "https://api.minimaxi.chat/v1/chat/completions";
  
  const messages: any[] = [];
  if (opts.systemPrompt) {
    messages.push({ role: "system", content: opts.systemPrompt });
  }
  messages.push({ role: "user", content: prompt });
  
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "MiniMax-M3",
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 4096,
    }),
  });
  
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Minimax API error (${res.status}): ${err}`);
  }
  
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error("No response from Minimax");
  // Strip <think>...</think> reasoning blocks (MiniMax-M3 chain-of-thought)
  return raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

// ─── Minimax Vision (image analysis via M3 multimodal) ───

async function callMinimaxVision(
  images: Array<{ url: string; base64?: string; mimeType?: string }>,
  prompt: string,
  opts: { temperature?: number; maxTokens?: number; systemPrompt?: string }
): Promise<string> {
  const apiKey = await getMinimaxKey();
  if (!apiKey) throw new Error("MINIMAX_API_KEY is not configured.");

  const url = "https://api.minimaxi.chat/v1/chat/completions";

  // Build content array with images + text
  const contentParts: any[] = [];

  for (const img of images) {
    if (img.base64) {
      // Send as data URI
      const mime = img.mimeType || "image/jpeg";
      contentParts.push({
        type: "image_url",
        image_url: { url: `data:${mime};base64,${img.base64}` },
      });
    } else if (img.url.startsWith("data:image")) {
      contentParts.push({
        type: "image_url",
        image_url: { url: img.url },
      });
    } else if (img.url.startsWith("http")) {
      contentParts.push({
        type: "image_url",
        image_url: { url: img.url },
      });
    }
  }

  contentParts.push({ type: "text", text: prompt });

  const messages: any[] = [];
  if (opts.systemPrompt) {
    messages.push({ role: "system", content: opts.systemPrompt });
  }
  messages.push({ role: "user", content: contentParts });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "MiniMax-M3",
      thinking: { type: "disabled" },
      messages,
      max_completion_tokens: opts.maxTokens ?? 8192,
      temperature: opts.temperature ?? 0.3,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Minimax vision error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error("No response from Minimax vision");
  return raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
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

// ─── OpenRouter image generation ───
// Dedicated images endpoint (different from the chat-completions endpoint
// used for text) — see https://openrouter.ai/docs/features/multimodal/image-generation.
// Response images come back as base64 in data[].b64_json, not a hosted URL.
async function generateImageOpenRouter(
  prompt: string,
  opts: { aspectRatio?: string; numImages?: number }
): Promise<string[]> {
  const apiKey = await getOpenRouterKey();
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured for image generation.");

  const model = (await getConfigValue("OPENROUTER_IMAGE_MODEL")) || "google/gemini-2.5-flash-image";

  const res = await fetch("https://openrouter.ai/api/v1/images", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://bpr.clinic",
      "X-Title": "BPR Clinic AI",
    },
    body: JSON.stringify({
      model,
      prompt,
      n: opts.numImages || 1,
      aspect_ratio: opts.aspectRatio || "1:1",
      output_format: "png",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter image generation error (${res.status}): ${err.slice(0, 300)}`);
  }

  const data = await res.json();
  const images = data.data || [];
  if (images.length === 0) throw new Error("OpenRouter returned no images");
  return images.map((img: any) => `data:${img.media_type || "image/png"};base64,${img.b64_json}`);
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

  const MAX_RETRIES = 3;
  let lastError = "";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    });

    if (res.status === 429 && attempt < MAX_RETRIES) {
      const waitMs = Math.pow(2, attempt + 1) * 15000; // 30s, 60s, 120s
      console.log(`[ai-provider] Image generation rate limited (429), retrying in ${waitMs / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})...`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    if (!res.ok) {
      const errText = await res.text();
      try { lastError = JSON.parse(errText).error?.message || errText.slice(0, 300); } catch { lastError = errText.slice(0, 300); }
      if (res.status === 429) {
        throw new Error(`Gemini image quota exceeded. ${lastError}. Please try again later or upload an image manually.`);
      }
      throw new Error(`Gemini image generation error (${res.status}): ${lastError}`);
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

  throw new Error(`Gemini image generation failed after ${MAX_RETRIES} retries: ${lastError}`);
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
 * Generate text using AI.
 * OpenRouter (Claude Sonnet 5) is first when OPENROUTER_API_KEY is configured.
 * Fallback chain: Minimax M3 → Groq → Gemini
 */
export async function callAI(prompt: string, opts?: AICallOptions): Promise<string> {
  const callOpts = {
    temperature: opts?.temperature,
    maxTokens: opts?.maxTokens,
    systemPrompt: opts?.systemPrompt,
  };

  // 0. OpenRouter / Claude Sonnet 5 — PRIMARY for all text when key is configured
  if ((await getOpenRouterKey()) || opts?.model?.startsWith('claude')) {
    try {
      return await claudeGenerateWithFallback(
        [{ role: 'user', content: prompt }],
        callOpts
      );
    } catch (err: any) {
      if (AI_STRICT_MODE) {
        console.error('[ai-provider] OpenRouter failed in strict mode, refusing to fall back to direct providers:', err.message);
        throw new Error(`AI provider unavailable (strict mode): ${err.message}`);
      }
      console.warn('[ai-provider] OpenRouter failed, falling back to direct providers:', err.message);
    }
  }

  // 1. Try Minimax M3 (primary fallback)
  const minimaxKey = await getMinimaxKey();
  if (minimaxKey) {
    try {
      return await callMinimaxDirect(prompt, callOpts);
    } catch (err: any) {
      console.warn("[ai-provider] Minimax M3 failed, trying Groq:", err.message);
    }
  }

  // 2. Try Groq (fast fallback)
  const groqKey = await getGroqKey();
  if (groqKey) {
    try {
      return await callGroqDirect(prompt, callOpts);
    } catch (err: any) {
      console.warn("[ai-provider] Groq failed, falling back to Gemini:", err.message);
    }
  }
  
  // 3. Fallback to Gemini
  return callGeminiDirect(prompt, callOpts);
}

/**
 * Alias of callAI — used for clinical AI tasks (diagnosis, protocol, SOAP notes, etc.)
 * Identical behaviour; exported separately for semantic clarity.
 */
export const callAIClinical = callAI;

/**
 * Generate images using the best available provider (DALL-E > OpenRouter >
 * Gemini direct — see generateImageSmart). Used to just call generateImageGemini
 * directly, which meant every caller here failed outright when only
 * OPENROUTER_API_KEY was configured (no GEMINI_API_KEY).
 */
export async function generateImage(prompt: string, opts?: AIImageOptions): Promise<string[]> {
  return generateImageSmart(prompt, opts);
}

/**
 * Analyze an image using AI vision capabilities.
 * Priority chain: OpenRouter vision (primary) → Minimax M3 → Gemini (fallback)
 * In AI_STRICT_MODE: only OpenRouter is used; fails hard if unavailable.
 */
export async function analyzeImage(
  imageUrl: string,
  prompt: string,
  opts?: AIVisionOptions & { systemPrompt?: string }
): Promise<string> {
  const callOpts = {
    temperature: opts?.temperature,
    maxTokens: opts?.maxTokens,
    systemPrompt: opts?.systemPrompt,
  };

  // 0. OpenRouter vision — PRIMARY when key is configured
  if (await getOpenRouterKey()) {
    try {
      return await claudeVision([{ url: imageUrl }], prompt, callOpts);
    } catch (err: any) {
      if (AI_STRICT_MODE) {
        console.error('[ai-provider] OpenRouter vision failed in strict mode:', err.message);
        throw new Error(`AI vision provider unavailable (strict mode): ${err.message}`);
      }
      console.warn('[ai-provider] OpenRouter vision failed, falling back to direct providers:', err.message);
    }
  }

  // 1. Try Minimax M3 vision
  const minimaxKey = await getMinimaxKey();
  if (minimaxKey) {
    try {
      return await callMinimaxVision(
        [{ url: imageUrl }],
        prompt,
        callOpts
      );
    } catch (err: any) {
      console.warn("[ai-provider] Minimax M3 vision failed, falling back to Gemini:", err.message);
    }
  }

  // 2. Fallback to Gemini
  return analyzeImageGemini(imageUrl, prompt, callOpts);
}

/**
 * Analyze multiple images using AI vision capabilities.
 * Priority chain: OpenRouter vision (primary) → Minimax M3 → Gemini (fallback, first image only)
 * In AI_STRICT_MODE: only OpenRouter is used; fails hard if unavailable.
 */
export async function analyzeMultipleImages(
  images: Array<{ url: string; base64?: string; mimeType?: string }>,
  prompt: string,
  opts?: AIVisionOptions & { systemPrompt?: string }
): Promise<string> {
  const callOpts = {
    temperature: opts?.temperature,
    maxTokens: opts?.maxTokens,
    systemPrompt: opts?.systemPrompt,
  };

  // 0. OpenRouter vision — PRIMARY when key is configured
  if (await getOpenRouterKey()) {
    try {
      return await claudeVision(images, prompt, callOpts);
    } catch (err: any) {
      if (AI_STRICT_MODE) {
        console.error('[ai-provider] OpenRouter multi-vision failed in strict mode:', err.message);
        throw new Error(`AI vision provider unavailable (strict mode): ${err.message}`);
      }
      console.warn('[ai-provider] OpenRouter multi-vision failed, falling back to direct providers:', err.message);
    }
  }

  // 1. Try Minimax M3 — supports multiple images natively
  const minimaxKey = await getMinimaxKey();
  if (minimaxKey) {
    try {
      return await callMinimaxVision(images, prompt, callOpts);
    } catch (err: any) {
      console.warn("[ai-provider] Minimax M3 multi-vision failed, falling back to Gemini:", err.message);
    }
  }

  // 2. Fallback to Gemini (use first image)
  const firstImage = images[0];
  const imgUrl = firstImage?.base64
    ? `data:${firstImage.mimeType || "image/jpeg"};base64,${firstImage.base64}`
    : firstImage?.url || "";
  return analyzeImageGemini(imgUrl, prompt, callOpts);
}

/**
 * Stream AI response. Uses the callAI chain (Groq → Minimax → Gemini).
 */
export async function streamAI(prompt: string, opts?: AIStreamOptions): Promise<ReadableStream<Uint8Array>> {
  const text = await callAI(prompt, {
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
 * Multi-turn chat using AI.
 * OpenRouter (Claude Sonnet 5) is first when OPENROUTER_API_KEY is configured.
 * Fallback chain: Minimax M3 → Groq → Gemini
 */
export async function callAIChat(
  messages: Array<{ role: string; content: string }>,
  opts?: { provider?: AIProvider; model?: string; temperature?: number; maxTokens?: number; systemPrompt?: string }
): Promise<string> {
  const chatOpts = {
    temperature: opts?.temperature,
    maxTokens: opts?.maxTokens,
    systemPrompt: opts?.systemPrompt,
  };

  // 0. OpenRouter / Claude Sonnet 5 — PRIMARY for all text when key is configured
  if ((await getOpenRouterKey()) || opts?.model?.startsWith('claude')) {
    const claudeMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    const systemMsg = opts?.systemPrompt
      || messages.find(m => m.role === 'system')?.content;
    try {
      return await claudeGenerateWithFallback(claudeMessages, {
        ...chatOpts,
        systemPrompt: systemMsg,
      });
    } catch (err: any) {
      if (AI_STRICT_MODE) {
        console.error('[ai-provider] OpenRouter chat failed in strict mode:', err.message);
        throw new Error(`AI provider unavailable (strict mode): ${err.message}`);
      }
      console.warn('[ai-provider] OpenRouter chat failed, falling back to direct providers:', err.message);
    }
  }

  // 1. Try Minimax M3 first (primary fallback)
  const minimaxKey = await getMinimaxKey();
  if (minimaxKey) {
    try {
      return await callMinimaxChat(messages, chatOpts);
    } catch (err: any) {
      console.warn("[ai-provider] Minimax M3 chat failed, trying Groq:", err.message);
    }
  }

  // 2. Try Groq (fast fallback)
  const groqKey = await getGroqKey();
  if (groqKey) {
    try {
      return await callGroqChat(messages, chatOpts);
    } catch (err: any) {
      console.warn("[ai-provider] Groq chat failed, falling back to Gemini:", err.message);
    }
  }

  // 3. Fallback to Gemini
  return callGeminiChat(messages, opts);
}

// ─── Minimax Chat ───

async function callMinimaxChat(
  messages: Array<{ role: string; content: string }>,
  opts: { temperature?: number; maxTokens?: number; systemPrompt?: string }
): Promise<string> {
  const apiKey = await getMinimaxKey();
  if (!apiKey) throw new Error("MINIMAX_API_KEY is not configured.");

  const apiMessages: any[] = [];
  if (opts.systemPrompt) {
    apiMessages.push({ role: "system", content: opts.systemPrompt });
  }
  for (const m of messages) {
    if (m.role === "system" && opts.systemPrompt) continue;
    apiMessages.push({
      role: m.role === "model" ? "assistant" : m.role,
      content: m.content,
    });
  }

  const res = await fetch("https://api.minimaxi.chat/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "MiniMax-M3",
      messages: apiMessages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 4096,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Minimax chat error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || "";
  return raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

// ─── Minimax Audio Transcription ───

export async function transcribeAudioMinimax(
  audioBuffer: Buffer,
  mimeType: string,
  language = "en"
): Promise<string> {
  const apiKey = await getMinimaxKey();
  if (!apiKey) throw new Error("MINIMAX_API_KEY is not configured.");

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
  formData.append("file", blob, `audio.${mimeType.split("/")[1] || "webm"}`);
  formData.append("model", "speech-01-hd");
  if (language) formData.append("language", language);

  const res = await fetch("https://api.minimaxi.chat/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Minimax transcription error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.text?.trim() || "";
}

// ─── Gemini Chat ───

async function callGeminiChat(
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
  hasGroq: boolean;
  hasMinimax: boolean;
  hasGemini: boolean;
  hasOpenAI: boolean;
  defaultProvider: string;
  fallbackChain: string[];
}> {
  const openRouterKey = await getOpenRouterKey();
  const groqKey = await getGroqKey();
  const minimaxKey = await getMinimaxKey();
  const geminiKey = await getGeminiKey();
  const openaiKey = await getOpenAIKey();

  let provider = "none";
  if (minimaxKey) provider = "minimax";
  else if (groqKey) provider = "groq";
  else if (geminiKey) provider = "gemini";
  else if (openaiKey) provider = "openai";

  const chain: string[] = [];
  if (openRouterKey) chain.push("openrouter (claude-sonnet-5 → gemini-2.5-flash)");
  if (minimaxKey) chain.push("minimax (MiniMax-M3)");
  if (groqKey) chain.push("groq");
  if (geminiKey) chain.push("gemini");

  return {
    provider,
    hasGroq: !!groqKey,
    hasMinimax: !!minimaxKey,
    hasGemini: !!geminiKey,
    hasOpenAI: !!openaiKey,
    defaultProvider: openRouterKey ? "openrouter" : "minimax",
    fallbackChain: chain,
  };
}

/**
 * Generate images using the best available AI provider.
 * Priority: DALL-E 3 (OpenAI) > Gemini Image > Stable Diffusion
 */
export async function generateImageSmart(prompt: string, opts?: AIImageOptions): Promise<string[]> {
  // Try OpenAI DALL-E 3 first (best quality)
  const openaiKey = await getOpenAIKey();
  if (openaiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt,
          n: 1,
          size: "1024x1024",
          quality: opts?.quality === "high" ? "hd" : "standard",
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        return data.data?.map((img: any) => img.url) || [];
      }
    } catch (err: any) {
      console.warn("[ai-provider] DALL-E 3 failed, falling back to Gemini:", err.message);
    }
  }
  
  // In strict mode, only DALL-E is approved for image gen (no Gemini/HuggingFace/OpenRouter)
  if (AI_STRICT_MODE) {
    throw new Error('Image generation failed (strict mode): DALL-E 3 unavailable, no fallback to Gemini/HuggingFace');
  }

  // Try OpenRouter next — the one key some setups configure (routes to
  // google/gemini-2.5-flash-image by default), works without a separate
  // GEMINI_API_KEY.
  const openRouterKey = await getOpenRouterKey();
  if (openRouterKey) {
    try {
      return await generateImageOpenRouter(prompt, { aspectRatio: opts?.aspectRatio, numImages: opts?.numImages });
    } catch (err: any) {
      console.warn("[ai-provider] OpenRouter image generation failed, falling back to Gemini:", err.message);
    }
  }

  // Fallback to direct Gemini API
  return generateImageGemini(prompt, {
    model: opts?.model,
    aspectRatio: opts?.aspectRatio,
    numImages: opts?.numImages,
  });
}
