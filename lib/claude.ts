// lib/claude.ts
// Claude API client — Claude Sonnet 5 (via OpenRouter or direct Anthropic)
// Priority: OpenRouter (claude-sonnet-5 slug) → Direct Anthropic (claude-sonnet-4-20250514 fallback)

import { getConfigValue } from './system-config'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

// When OpenRouter primary model fails, try this fallback within OpenRouter
export const OPENROUTER_FALLBACK_MODEL = 'google/gemini-2.5-flash'

// Resolves keys from the DB-backed SystemConfig store first (set via Admin →
// AI Settings), falling back to .env — same pattern as lib/system-config.ts.
// Read fresh on every call instead of once at module load, so saving a key
// in the admin UI takes effect immediately without a redeploy.
async function resolveClaudeConfig(): Promise<{
  useOpenRouter: boolean
  openRouterKey: string
  anthropicKey: string
  defaultModel: string
}> {
  const [openRouterKey, anthropicKey] = await Promise.all([
    getConfigValue('OPENROUTER_API_KEY'),
    getConfigValue('ANTHROPIC_API_KEY'),
  ])
  const useOpenRouter = Boolean(openRouterKey)
  return {
    useOpenRouter,
    openRouterKey: openRouterKey || '',
    anthropicKey: anthropicKey || '',
    defaultModel: useOpenRouter ? 'anthropic/claude-sonnet-5' : 'claude-sonnet-4-20250514',
  }
}

// AI_STRICT_MODE: when true, never fall back to direct Minimax/Groq/Gemini calls.
// Only OpenRouter is used for text + vision. STT/image-gen fail hard if their
// dedicated providers are unavailable.
export const AI_STRICT_MODE = process.env.AI_STRICT_MODE === 'true'

export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ClaudeResponse {
  id: string
  type: string
  role: string
  content: Array<{ type: string; text: string }>
  model: string
  stop_reason: string
  usage: { input_tokens: number; output_tokens: number }
}

export interface GenerateOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
}

/**
 * Generate text via Claude API (non-streaming)
 * Routes through OpenRouter (claude-sonnet-5) when OPENROUTER_API_KEY is set,
 * otherwise falls back to direct Anthropic API.
 */
export async function claudeGenerate(
  messages: ClaudeMessage[],
  options: GenerateOptions = {}
): Promise<string> {
  const { useOpenRouter, openRouterKey, anthropicKey, defaultModel } = await resolveClaudeConfig()
  const {
    model = defaultModel,
    temperature = 0.7,
    maxTokens = 4096,
    systemPrompt,
  } = options

  // ── OpenRouter path (OpenAI-compatible) ────────────────────────────────────
  if (useOpenRouter) {
    const openRouterMessages: any[] = []
    if (systemPrompt) openRouterMessages.push({ role: 'system', content: systemPrompt })
    for (const m of messages) openRouterMessages.push(m)

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://bpr.clinic',
        'X-Title': 'BPR Clinic AI',
      },
      body: JSON.stringify({ model, messages: openRouterMessages, temperature, max_tokens: maxTokens }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenRouter API error ${response.status}: ${error}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || ''
  }

  // ── Direct Anthropic path ──────────────────────────────────────────────────
  if (!anthropicKey) {
    throw new Error('No AI key configured — set OPENROUTER_API_KEY or ANTHROPIC_API_KEY in Admin → AI Settings')
  }

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    temperature,
    messages,
  }

  if (systemPrompt) {
    body.system = systemPrompt
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Claude API error ${response.status}: ${error}`)
  }

  const data: ClaudeResponse = await response.json()
  return data.content.map(c => c.text).join('')
}

/**
 * Streaming — for real-time response UIs
 * Routes through OpenRouter (SSE/OpenAI format) when OPENROUTER_API_KEY is set.
 */
export async function claudeStream(
  messages: ClaudeMessage[],
  onChunk: (text: string) => void,
  options: GenerateOptions = {}
): Promise<string> {
  const { useOpenRouter, openRouterKey, anthropicKey, defaultModel } = await resolveClaudeConfig()
  const {
    model = defaultModel,
    temperature = 0.7,
    maxTokens = 4096,
    systemPrompt,
  } = options

  // ── OpenRouter streaming path ──────────────────────────────────────────────
  if (useOpenRouter) {
    const openRouterMessages: any[] = []
    if (systemPrompt) openRouterMessages.push({ role: 'system', content: systemPrompt })
    for (const m of messages) openRouterMessages.push(m)

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://bpr.clinic',
        'X-Title': 'BPR Clinic AI',
      },
      body: JSON.stringify({ model, messages: openRouterMessages, temperature, max_tokens: maxTokens, stream: true }),
    })

    if (!response.ok) throw new Error(`OpenRouter stream error: ${response.status}`)

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let fullText = ''
    if (!reader) throw new Error('No response body')

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      for (const line of chunk.split('\n').filter(Boolean)) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6)
        if (payload === '[DONE]') continue
        try {
          const parsed = JSON.parse(payload)
          const text = parsed.choices?.[0]?.delta?.content
          if (text) { fullText += text; onChunk(text) }
        } catch {}
      }
    }
    return fullText
  }

  // ── Direct Anthropic streaming path ───────────────────────────────────────
  if (!anthropicKey) {
    throw new Error('No AI key configured — set OPENROUTER_API_KEY or ANTHROPIC_API_KEY in Admin → AI Settings')
  }

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    temperature,
    messages,
    stream: true,
  }

  if (systemPrompt) {
    body.system = systemPrompt
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) throw new Error(`Claude stream error: ${response.status}`)

  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  let fullText = ''

  if (!reader) throw new Error('No response body')

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter(Boolean)

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (data === '[DONE]') continue

      try {
        const parsed = JSON.parse(data)
        if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
          fullText += parsed.delta.text
          onChunk(parsed.delta.text)
        }
      } catch {}
    }
  }

  return fullText
}

/**
 * Check if Claude API is available
 */
export async function checkClaudeHealth(): Promise<{
  available: boolean
  model: string
  gateway: string
  error?: string
}> {
  const { useOpenRouter, openRouterKey, anthropicKey, defaultModel } = await resolveClaudeConfig()
  const gateway = useOpenRouter ? 'OpenRouter' : 'Anthropic Direct'

  if (useOpenRouter) {
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://bpr.clinic',
          'X-Title': 'BPR Clinic AI',
        },
        body: JSON.stringify({ model: defaultModel, max_tokens: 10, messages: [{ role: 'user', content: 'ping' }] }),
      })
      if (!response.ok) {
        const err = await response.text()
        return { available: false, model: defaultModel, gateway, error: `API error: ${err.substring(0, 100)}` }
      }
      return { available: true, model: defaultModel, gateway }
    } catch (err) {
      return { available: false, model: defaultModel, gateway, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  if (!anthropicKey) {
    return { available: false, model: defaultModel, gateway, error: 'No AI key configured — set OPENROUTER_API_KEY or ANTHROPIC_API_KEY in Admin → AI Settings' }
  }

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: defaultModel,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return { available: false, model: defaultModel, gateway, error: `API error: ${err.substring(0, 100)}` }
    }

    return { available: true, model: defaultModel, gateway }
  } catch (err) {
    return { available: false, model: defaultModel, gateway, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Generate text via Claude with automatic fallback within OpenRouter.
 * Tries primary model (claude-sonnet-5) first, then fallback model (gemini-2.5-flash).
 * Only used when USE_OPENROUTER is true.
 */
export async function claudeGenerateWithFallback(
  messages: ClaudeMessage[],
  options: GenerateOptions = {}
): Promise<string> {
  const { useOpenRouter } = await resolveClaudeConfig();
  if (!useOpenRouter) {
    return claudeGenerate(messages, options);
  }

  try {
    return await claudeGenerate(messages, options);
  } catch (err: any) {
    console.warn('[claude] Primary model failed, trying OpenRouter fallback:', err.message);
    return claudeGenerate(messages, { ...options, model: OPENROUTER_FALLBACK_MODEL });
  }
}

/**
 * Analyze images via OpenRouter using vision-capable models.
 * Uses OpenAI-compatible image_url format.
 * Tries claude-sonnet-5 first, then gemini-2.5-flash as fallback.
 */
export async function claudeVision(
  images: Array<{ url: string; base64?: string; mimeType?: string }>,
  prompt: string,
  options: GenerateOptions = {}
): Promise<string> {
  const { useOpenRouter, openRouterKey, defaultModel } = await resolveClaudeConfig();
  if (!useOpenRouter) {
    throw new Error('claudeVision requires OPENROUTER_API_KEY to be configured (Admin → AI Settings or .env)');
  }

  const contentParts: any[] = [];
  for (const img of images) {
    if (img.base64) {
      const mime = img.mimeType || 'image/jpeg';
      contentParts.push({
        type: 'image_url',
        image_url: { url: `data:${mime};base64,${img.base64}` },
      });
    } else if (img.url.startsWith('data:image')) {
      contentParts.push({ type: 'image_url', image_url: { url: img.url } });
    } else if (img.url.startsWith('http')) {
      contentParts.push({ type: 'image_url', image_url: { url: img.url } });
    }
  }
  contentParts.push({ type: 'text', text: prompt });

  const openRouterMessages: any[] = [];
  if (options.systemPrompt) {
    openRouterMessages.push({ role: 'system', content: options.systemPrompt });
  }
  openRouterMessages.push({ role: 'user', content: contentParts });

  const tryModel = async (model: string) => {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://bpr.clinic',
        'X-Title': 'BPR Clinic AI',
      },
      body: JSON.stringify({
        model,
        messages: openRouterMessages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 8192,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter vision error (${model}) ${response.status}: ${error}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error(`No response from OpenRouter vision (${model})`);
    return text;
  };

  try {
    return await tryModel(DEFAULT_MODEL);
  } catch (err: any) {
    console.warn('[claude] Vision primary model failed, trying fallback:', err.message);
    return tryModel(OPENROUTER_FALLBACK_MODEL);
  }
}
