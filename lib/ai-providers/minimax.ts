/**
 * Minimax AI Provider (MiniMax-M3)
 * OpenAI-compatible API at api.minimaxi.chat
 * Primary model: MiniMax-M3 (multimodal, reasoning)
 */

export interface MinimaxChatParams {
  model?: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
}

export interface MinimaxResponse {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    total_tokens: number;
  };
  base_resp: {
    status_code: number;
    status_msg: string;
  };
}

/**
 * Call Minimax Chat Completion API (MiniMax-M3)
 * Uses OpenAI-compatible endpoint at api.minimaxi.chat
 */
export async function callMinimax({
  model = 'MiniMax-M3',
  messages,
  temperature = 0.1,
  maxTokens = 8000,
  topP = 0.95,
  stream = false,
}: MinimaxChatParams): Promise<MinimaxResponse> {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    throw new Error('MINIMAX_API_KEY not configured in environment variables');
  }

  // MiniMax-M3 OpenAI-compatible endpoint
  const endpoint = 'https://api.minimaxi.chat/v1/chat/completions';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_completion_tokens: maxTokens,
      top_p: topP,
      stream,
      thinking: { type: 'disabled' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Minimax M3] API error:', errorText);
    throw new Error(`Minimax M3 API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();

  // Normalize response to match MinimaxResponse interface
  if (!result.usage) result.usage = { total_tokens: 0 };
  if (!result.base_resp) result.base_resp = { status_code: 0, status_msg: 'ok' };

  return result;
}

/**
 * Available Minimax Models
 */
export const MINIMAX_MODELS = {
  // MiniMax-M3 (Current - Best Performance)
  M3: 'MiniMax-M3',
  
  // Legacy aliases (all point to M3 now)
  ABAB7_CHAT_PREVIEW: 'MiniMax-M3',
  ABAB6_5S_CHAT: 'MiniMax-M3',
  ABAB6_5G_CHAT: 'MiniMax-M3',
  ABAB6_5T_CHAT: 'MiniMax-M3',
  ABAB6_CHAT: 'MiniMax-M3',
} as const;

/**
 * Model Recommendations by Use Case
 */
export const MINIMAX_USE_CASES = {
  // All use cases now use MiniMax-M3
  MARKETING: MINIMAX_MODELS.M3,
  CLINICAL: MINIMAX_MODELS.M3,
  CHAT: MINIMAX_MODELS.M3,
  QUICK: MINIMAX_MODELS.M3,
  PORTUGUESE: MINIMAX_MODELS.M3,
  BIOMECHANICS: MINIMAX_MODELS.M3,
} as const;

/**
 * Helper: Extract content from Minimax response
 */
export function extractContentFromMinimax(response: MinimaxResponse): string {
  const raw = response.choices[0]?.message?.content || '';
  // Strip M3 thinking tags if present
  return raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

/**
 * Helper: Extract JSON from Minimax response
 */
export function extractJsonFromMinimax(response: MinimaxResponse): any {
  const content = extractContentFromMinimax(response);
  
  // Try to find JSON in response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('[Minimax] Failed to parse JSON:', e);
    }
  }
  
  return { rawResponse: content };
}

/**
 * Helper: Calculate cost estimate
 */
export function estimateMinimaxCost(response: MinimaxResponse): number {
  // MiniMax-M3 pricing: ~$0.11/1M input, ~$0.43/1M output
  const tokens = response.usage.total_tokens;
  return (tokens / 1_000_000) * 0.30; // blended estimate
}

/**
 * Specialized: Generate Marketing Content
 */
export async function generateMarketingContent({
  topic,
  platform,
  tone = 'professional',
  language = 'pt-BR',
  maxLength = 500,
}: {
  topic: string;
  platform: 'instagram' | 'facebook' | 'linkedin' | 'twitter' | 'blog';
  tone?: 'professional' | 'casual' | 'friendly' | 'authoritative';
  language?: string;
  maxLength?: number;
}): Promise<string> {
  
  const platformGuidelines = {
    instagram: 'Visual, engaging, use emojis, hashtags, short paragraphs',
    facebook: 'Conversational, storytelling, community-focused',
    linkedin: 'Professional, data-driven, industry insights',
    twitter: 'Concise, punchy, trending topics',
    blog: 'In-depth, educational, SEO-optimized',
  };

  const systemPrompt = `You are an expert marketing copywriter specializing in health and wellness content.
Write in ${language === 'pt-BR' ? 'Brazilian Portuguese (PT-BR)' : 'English'}.
Tone: ${tone}
Platform: ${platform} - ${platformGuidelines[platform]}
Maximum length: ${maxLength} characters`;

  const userPrompt = `Create engaging ${platform} content about: ${topic}

Requirements:
- Capture attention in first line
- Include call-to-action
- Use appropriate hashtags (if applicable)
- Maintain ${tone} tone
- Stay under ${maxLength} characters
- Focus on patient benefits and outcomes`;

  const response = await callMinimax({
    model: MINIMAX_MODELS.M3,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    maxTokens: 1000,
  });

  return extractContentFromMinimax(response);
}

/**
 * Specialized: Improve Clinical Text
 */
export async function improveClinicalText({
  text,
  language = 'pt-BR',
  style = 'professional',
}: {
  text: string;
  language?: string;
  style?: 'professional' | 'patient-friendly' | 'technical';
}): Promise<string> {
  
  const styleGuidelines = {
    professional: 'Clinical terminology, precise, evidence-based',
    'patient-friendly': 'Simple language, empathetic, easy to understand',
    technical: 'Medical jargon, detailed, academic',
  };

  const systemPrompt = `You are a clinical writing expert.
Improve the following text while maintaining accuracy.
Language: ${language === 'pt-BR' ? 'Brazilian Portuguese (PT-BR)' : 'English'}
Style: ${style} - ${styleGuidelines[style]}`;

  const userPrompt = `Improve this clinical text:\n\n${text}\n\nMake it more ${style} while keeping all medical facts accurate.`;

  const response = await callMinimax({
    model: MINIMAX_MODELS.M3,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    maxTokens: 2000,
  });

  return extractContentFromMinimax(response);
}
