// Unified AI Provider
// Text (general):   Claude (primary) → Minimax M3 (non-clinical fallback) → Groq → Gemini
// Text (clinical):  Claude → Groq → Gemini  [NEVER Minimax — GDPR/UK data sovereignty]
// Vision (clinical): Claude Vision → Gemini  [NEVER Minimax]
// Image generation: Gemini (Claude cannot generate images)
// Audio STT:        Minimax speech-01-hd → Groq Whisper → Gemini multimodal
// All AI calls in the system should go through this layer.

import { getConfigValue } from "@/lib/system-config";

// ─── Types ───

export type AIProvider = "groq" | "minimax" | "gemini" | "openai" | "claude";

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

async function getClaudeKey(): Promise<string | null> {
  return (await getConfigValue("ANTHROPIC_API_KEY")) || process.env.ANTHROPIC_API_KEY || null;
}

async function getHuggingFaceKey(): Promise<string | null> {
  return (await getConfigValue("HUGGINGFACE_API_KEY")) || process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || null;
}

async function getHuggingFaceImageModel(): Promise<string> {
  return (await getConfigValue("HF_IMAGE_MODEL")) || "black-forest-labs/FLUX.1-schnell";
}

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

// 3-tier model routing
export const CLAUDE_HAIKU_MODEL  = "claude-haiku-4-5-20251001"; // form extraction, classification, simple tasks
export const CLAUDE_SONNET_MODEL = "claude-sonnet-4-6";          // articles, reports, drafts, communications
export const CLAUDE_OPUS_MODEL   = "claude-opus-4-8";            // clinical reasoning, biomechanical analysis, complex synthesis

const CLAUDE_DEFAULT_MODEL  = CLAUDE_HAIKU_MODEL;
const CLAUDE_CLINICAL_MODEL = CLAUDE_OPUS_MODEL;

async function getGeminiModel(): Promise<string> {
  return (await getConfigValue("GEMINI_MODEL")) || "gemini-2.0-flash";
}

async function getImageModel(): Promise<string> {
  return (await getConfigValue("AI_IMAGE_MODEL")) || "gemini-2.5-flash-image";
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

// ─── Hugging Face image generation (free FLUX.1-schnell) ───

/** Map an aspect ratio string to width/height suitable for FLUX. */
function aspectToDimensions(aspectRatio?: string): { width: number; height: number } {
  switch (aspectRatio) {
    case "1:1": return { width: 1024, height: 1024 };
    case "4:3": return { width: 1024, height: 768 };
    case "3:4": return { width: 768, height: 1024 };
    case "9:16": return { width: 576, height: 1024 };
    case "16:9":
    default: return { width: 1024, height: 576 };
  }
}

async function generateImageHuggingFace(
  prompt: string,
  opts: { model?: string; aspectRatio?: string }
): Promise<string[]> {
  const apiKey = await getHuggingFaceKey();
  if (!apiKey) throw new Error("HUGGINGFACE_API_KEY is not configured for image generation.");

  const model = opts.model || (await getHuggingFaceImageModel());
  const { width, height } = aspectToDimensions(opts.aspectRatio);
  const url = `https://router.huggingface.co/hf-inference/models/${model}`;

  const MAX_RETRIES = 2;
  let lastError = "";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ inputs: prompt, parameters: { width, height } }),
    });

    if (res.ok) {
      const contentType = res.headers.get("content-type") || "";
      const buffer = Buffer.from(await res.arrayBuffer());
      if (contentType.startsWith("image/")) {
        const mime = contentType.split(";")[0];
        return [`data:${mime};base64,${buffer.toString("base64")}`];
      }
      lastError = `Unexpected content-type: ${contentType}`;
      break;
    }

    // 503 = model loading/cold start; retry after the estimated time
    if (res.status === 503 && attempt < MAX_RETRIES) {
      const body = await res.json().catch(() => ({}));
      const waitMs = Math.min(((body as any)?.estimated_time || 20) * 1000, 30000);
      console.log(`[ai-provider] HF model loading (503), retrying in ${waitMs / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})...`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    lastError = await res.text().catch(() => `HTTP ${res.status}`);
    console.error(`[ai-provider] HF image error (${res.status}):`, lastError.slice(0, 300));
    break;
  }

  throw new Error(`Hugging Face image generation failed: ${lastError}`);
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

// ─── Claude (Anthropic) AI calls ───

async function callClaudeDirect(
  prompt: string,
  opts: { temperature?: number; maxTokens?: number; systemPrompt?: string; model?: string }
): Promise<string> {
  const apiKey = await getClaudeKey();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");

  const body: any = {
    model: opts.model || CLAUDE_DEFAULT_MODEL,
    max_tokens: opts.maxTokens ?? 4096,
    messages: [{ role: "user", content: prompt }],
  };
  if (opts.systemPrompt) body.system = opts.systemPrompt;
  if (opts.temperature !== undefined) body.temperature = opts.temperature;

  const res = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error("No response from Claude");
  return text.trim();
}

async function callClaudeChat(
  messages: Array<{ role: string; content: string }>,
  opts: { temperature?: number; maxTokens?: number; systemPrompt?: string; model?: string }
): Promise<string> {
  const apiKey = await getClaudeKey();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");

  const apiMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "model" ? "assistant" : m.role,
      content: m.content,
    }));

  const body: any = {
    model: opts.model || CLAUDE_DEFAULT_MODEL,
    max_tokens: opts.maxTokens ?? 4096,
    messages: apiMessages,
  };

  const systemMsg = messages.find((m) => m.role === "system");
  const systemText = opts.systemPrompt || systemMsg?.content;
  if (systemText) body.system = systemText;
  if (opts.temperature !== undefined) body.temperature = opts.temperature;

  const res = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude chat error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text?.trim() || "";
}

async function callClaudeVision(
  images: Array<{ url: string; base64?: string; mimeType?: string }>,
  prompt: string,
  opts: { temperature?: number; maxTokens?: number; systemPrompt?: string }
): Promise<string> {
  const apiKey = await getClaudeKey();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");

  const contentParts: any[] = [];

  for (const img of images) {
    if (img.base64) {
      contentParts.push({
        type: "image",
        source: { type: "base64", media_type: img.mimeType || "image/jpeg", data: img.base64 },
      });
    } else if (img.url.startsWith("data:image")) {
      const match = img.url.match(/^data:(image\/[\w+]+);base64,(.+)$/);
      if (match) {
        contentParts.push({
          type: "image",
          source: { type: "base64", media_type: match[1], data: match[2] },
        });
      }
    } else if (img.url.startsWith("http")) {
      try {
        const imgRes = await fetch(img.url, { signal: AbortSignal.timeout(10000) });
        if (imgRes.ok) {
          const buf = await imgRes.arrayBuffer();
          const mime = imgRes.headers.get("content-type") || "image/jpeg";
          contentParts.push({
            type: "image",
            source: { type: "base64", media_type: mime, data: Buffer.from(buf).toString("base64") },
          });
        }
      } catch {
        // Skip image if unreachable
      }
    }
  }

  contentParts.push({ type: "text", text: prompt });

  const body: any = {
    model: CLAUDE_CLINICAL_MODEL,
    max_tokens: opts.maxTokens ?? 8192,
    messages: [{ role: "user", content: contentParts }],
  };
  if (opts.systemPrompt) body.system = opts.systemPrompt;
  if (opts.temperature !== undefined) body.temperature = opts.temperature;

  const res = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude vision error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error("No response from Claude vision");
  return text.trim();
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API — Use these functions throughout the system
// ═══════════════════════════════════════════════════════════════

/**
 * Generate text using AI (general use — non-clinical).
 * Priority chain: Claude (primary) → Minimax M3 → Groq → Gemini
 */
export async function callAI(prompt: string, opts?: AICallOptions): Promise<string> {
  const callOpts = {
    temperature: opts?.temperature,
    maxTokens: opts?.maxTokens,
    systemPrompt: opts?.systemPrompt,
    model: opts?.model,
  };

  // 1. Claude (primary)
  const claudeKey = await getClaudeKey();
  if (claudeKey) {
    try {
      return await callClaudeDirect(prompt, callOpts);
    } catch (err: any) {
      console.warn("[ai-provider] Claude failed, trying Minimax:", err.message);
    }
  }

  // 2. Minimax M3 (non-clinical fallback)
  const minimaxKey = await getMinimaxKey();
  if (minimaxKey) {
    try {
      return await callMinimaxDirect(prompt, callOpts);
    } catch (err: any) {
      console.warn("[ai-provider] Minimax M3 failed, trying Groq:", err.message);
    }
  }

  // 3. Groq
  const groqKey = await getGroqKey();
  if (groqKey) {
    try {
      return await callGroqDirect(prompt, callOpts);
    } catch (err: any) {
      console.warn("[ai-provider] Groq failed, falling back to Gemini:", err.message);
    }
  }

  // 4. Gemini (last resort)
  return callGeminiDirect(prompt, callOpts);
}

/**
 * Generate text using AI — CLINICAL DATA ONLY.
 * Chain: Claude → Groq → Gemini. Minimax is NEVER used (GDPR/UK data sovereignty).
 */
export async function callAIClinical(prompt: string, opts?: AICallOptions): Promise<string> {
  const callOpts = {
    temperature: opts?.temperature,
    maxTokens: opts?.maxTokens,
    systemPrompt: opts?.systemPrompt,
  };

  // 1. Claude (required for clinical data)
  const claudeKey = await getClaudeKey();
  if (claudeKey) {
    try {
      return await callClaudeDirect(prompt, { ...callOpts, model: CLAUDE_CLINICAL_MODEL });
    } catch (err: any) {
      console.warn("[ai-provider] Claude clinical failed, trying Groq:", err.message);
    }
  }

  // 2. Groq (GDPR-compliant EU)
  const groqKey = await getGroqKey();
  if (groqKey) {
    try {
      return await callGroqDirect(prompt, callOpts);
    } catch (err: any) {
      console.warn("[ai-provider] Groq clinical failed, falling back to Gemini:", err.message);
    }
  }

  // 3. Gemini
  return callGeminiDirect(prompt, callOpts);
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
 * Analyze an image using AI vision (clinical — GDPR safe).
 * Priority chain: Claude Vision (primary) → Gemini (fallback). Minimax never used.
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

  // 1. Claude Vision (primary — GDPR compliant)
  const claudeKey = await getClaudeKey();
  if (claudeKey) {
    try {
      return await callClaudeVision([{ url: imageUrl }], prompt, callOpts);
    } catch (err: any) {
      console.warn("[ai-provider] Claude vision failed, falling back to Gemini:", err.message);
    }
  }

  // 2. Gemini (fallback)
  return analyzeImageGemini(imageUrl, prompt, callOpts);
}

/**
 * Analyze multiple images using AI vision (clinical — GDPR safe).
 * Priority chain: Claude Vision (primary) → Gemini (fallback). Minimax never used.
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

  // 1. Claude Vision (primary — supports multiple images, GDPR compliant)
  const claudeKey = await getClaudeKey();
  if (claudeKey) {
    try {
      return await callClaudeVision(images, prompt, callOpts);
    } catch (err: any) {
      console.warn("[ai-provider] Claude multi-vision failed, falling back to Gemini:", err.message);
    }
  }

  // 2. Gemini fallback (first image only)
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
 * Multi-turn chat using AI (general use).
 * Priority chain: Claude → Minimax M3 → Groq → Gemini
 */
export async function callAIChat(
  messages: Array<{ role: string; content: string }>,
  opts?: { provider?: AIProvider; model?: string; temperature?: number; maxTokens?: number; systemPrompt?: string }
): Promise<string> {
  const chatOpts = {
    temperature: opts?.temperature,
    maxTokens: opts?.maxTokens,
    systemPrompt: opts?.systemPrompt,
    model: opts?.model,
  };

  // 1. Claude (primary)
  const claudeKey = await getClaudeKey();
  if (claudeKey) {
    try {
      return await callClaudeChat(messages, chatOpts);
    } catch (err: any) {
      console.warn("[ai-provider] Claude chat failed, trying Minimax:", err.message);
    }
  }

  // 2. Minimax M3 (non-clinical fallback)
  const minimaxKey = await getMinimaxKey();
  if (minimaxKey) {
    try {
      return await callMinimaxChat(messages, chatOpts);
    } catch (err: any) {
      console.warn("[ai-provider] Minimax M3 chat failed, trying Groq:", err.message);
    }
  }

  // 3. Groq
  const groqKey = await getGroqKey();
  if (groqKey) {
    try {
      return await callGroqChat(messages, chatOpts);
    } catch (err: any) {
      console.warn("[ai-provider] Groq chat failed, falling back to Gemini:", err.message);
    }
  }

  // 4. Gemini
  return callGeminiChat(messages, opts);
}

/**
 * Multi-turn chat — CLINICAL DATA ONLY.
 * Chain: Claude → Groq → Gemini. Minimax is NEVER used.
 */
export async function callAIChatClinical(
  messages: Array<{ role: string; content: string }>,
  opts?: { provider?: AIProvider; model?: string; temperature?: number; maxTokens?: number; systemPrompt?: string }
): Promise<string> {
  const chatOpts = {
    temperature: opts?.temperature,
    maxTokens: opts?.maxTokens,
    systemPrompt: opts?.systemPrompt,
    model: CLAUDE_CLINICAL_MODEL,
  };

  // 1. Claude
  const claudeKey = await getClaudeKey();
  if (claudeKey) {
    try {
      return await callClaudeChat(messages, chatOpts);
    } catch (err: any) {
      console.warn("[ai-provider] Claude clinical chat failed, trying Groq:", err.message);
    }
  }

  // 2. Groq
  const groqKey = await getGroqKey();
  if (groqKey) {
    try {
      return await callGroqChat(messages, chatOpts);
    } catch (err: any) {
      console.warn("[ai-provider] Groq clinical chat failed, falling back to Gemini:", err.message);
    }
  }

  // 3. Gemini
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
  hasClaude: boolean;
  hasGroq: boolean;
  hasMinimax: boolean;
  hasGemini: boolean;
  hasOpenAI: boolean;
  defaultProvider: string;
  fallbackChain: string[];
  clinicalChain: string[];
}> {
  const claudeKey = await getClaudeKey();
  const groqKey = await getGroqKey();
  const minimaxKey = await getMinimaxKey();
  const geminiKey = await getGeminiKey();
  const openaiKey = await getOpenAIKey();

  let provider = "none";
  if (claudeKey) provider = "claude";
  else if (minimaxKey) provider = "minimax";
  else if (groqKey) provider = "groq";
  else if (geminiKey) provider = "gemini";
  else if (openaiKey) provider = "openai";

  const chain: string[] = [];
  if (claudeKey) chain.push("claude (Haiku 4.5)");
  if (minimaxKey) chain.push("minimax (MiniMax-M3)");
  if (groqKey) chain.push("groq");
  if (geminiKey) chain.push("gemini");

  const clinicalChain: string[] = [];
  if (claudeKey) clinicalChain.push("claude (Sonnet 4.6)");
  if (groqKey) clinicalChain.push("groq");
  if (geminiKey) clinicalChain.push("gemini");

  return {
    provider,
    hasClaude: !!claudeKey,
    hasGroq: !!groqKey,
    hasMinimax: !!minimaxKey,
    hasGemini: !!geminiKey,
    hasOpenAI: !!openaiKey,
    defaultProvider: "claude",
    fallbackChain: chain,
    clinicalChain,
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
      console.warn("[ai-provider] DALL-E 3 failed, falling back to Hugging Face:", err.message);
    }
  }

  // Try Hugging Face FLUX.1-schnell (free tier — reliable, no billing required)
  const hfKey = await getHuggingFaceKey();
  if (hfKey) {
    try {
      const imgs = await generateImageHuggingFace(prompt, {
        model: opts?.model,
        aspectRatio: opts?.aspectRatio,
      });
      if (imgs.length > 0) return imgs;
    } catch (err: any) {
      console.warn("[ai-provider] Hugging Face failed, falling back to Gemini:", err.message);
    }
  }

  // Last resort: Gemini (requires billing-enabled project)
  return generateImageGemini(prompt, {
    model: opts?.model,
    aspectRatio: opts?.aspectRatio,
    numImages: opts?.numImages,
  });
}
