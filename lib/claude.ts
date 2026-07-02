// lib/claude.ts
// Claude API client — Claude Sonnet 5 (via OpenRouter or direct Anthropic)
// Priority: OpenRouter (claude-sonnet-5 slug) → Direct Anthropic (claude-sonnet-4-20250514 fallback)

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

// Use OpenRouter if key is set (gives access to claude-sonnet-5 + other latest models)
// Otherwise fall back to direct Anthropic API
const USE_OPENROUTER = Boolean(OPENROUTER_API_KEY)
const DEFAULT_MODEL = USE_OPENROUTER ? 'anthropic/claude-sonnet-5' : 'claude-sonnet-4-20250514'

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
  const {
    model = DEFAULT_MODEL,
    temperature = 0.7,
    maxTokens = 4096,
    systemPrompt,
  } = options

  // ── OpenRouter path (OpenAI-compatible) ────────────────────────────────────
  if (USE_OPENROUTER) {
    const openRouterMessages: any[] = []
    if (systemPrompt) openRouterMessages.push({ role: 'system', content: systemPrompt })
    for (const m of messages) openRouterMessages.push(m)

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://bpr.rehab',
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
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured in .env')
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
      'x-api-key': ANTHROPIC_API_KEY,
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
  const {
    model = DEFAULT_MODEL,
    temperature = 0.7,
    maxTokens = 4096,
    systemPrompt,
  } = options

  // ── OpenRouter streaming path ──────────────────────────────────────────────
  if (USE_OPENROUTER) {
    const openRouterMessages: any[] = []
    if (systemPrompt) openRouterMessages.push({ role: 'system', content: systemPrompt })
    for (const m of messages) openRouterMessages.push(m)

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://bpr.rehab',
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
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured in .env')
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
      'x-api-key': ANTHROPIC_API_KEY,
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
  const gateway = USE_OPENROUTER ? 'OpenRouter' : 'Anthropic Direct'

  if (USE_OPENROUTER) {
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://bpr.rehab',
          'X-Title': 'BPR Clinic AI',
        },
        body: JSON.stringify({ model: DEFAULT_MODEL, max_tokens: 10, messages: [{ role: 'user', content: 'ping' }] }),
      })
      if (!response.ok) {
        const err = await response.text()
        return { available: false, model: DEFAULT_MODEL, gateway, error: `API error: ${err.substring(0, 100)}` }
      }
      return { available: true, model: DEFAULT_MODEL, gateway }
    } catch (err) {
      return { available: false, model: DEFAULT_MODEL, gateway, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  if (!ANTHROPIC_API_KEY) {
    return { available: false, model: DEFAULT_MODEL, gateway, error: 'ANTHROPIC_API_KEY not set in .env' }
  }

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return { available: false, model: DEFAULT_MODEL, gateway, error: `API error: ${err.substring(0, 100)}` }
    }

    return { available: true, model: DEFAULT_MODEL, gateway }
  } catch (err) {
    return { available: false, model: DEFAULT_MODEL, gateway, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
