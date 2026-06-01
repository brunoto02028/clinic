/**
 * Minimax AI Provider
 * Advanced Chinese AI with excellent multilingual support
 * Best for: Creative content, PT-BR, Marketing
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
 * Call Minimax Chat Completion API
 * Models: abab7-chat-preview (latest), abab6.5s-chat, abab6.5g-chat
 */
export async function callMinimax({
  model = 'abab7-chat-preview',
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

  // Minimax API endpoint
  const endpoint = 'https://api.minimax.chat/v1/text/chatcompletion_v2';

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
      max_tokens: maxTokens,
      top_p: topP,
      stream,
      // Minimax-specific parameters
      tokens_to_generate: maxTokens,
      reply_constraints: {
        sender_type: 'BOT',
        sender_name: 'BPR Assistant',
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Minimax] API error:', errorText);
    throw new Error(`Minimax API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  
  // Check for API-level errors
  if (result.base_resp?.status_code !== 0) {
    throw new Error(`Minimax API error: ${result.base_resp?.status_msg || 'Unknown error'}`);
  }

  return result;
}

/**
 * Available Minimax Models
 */
export const MINIMAX_MODELS = {
  // abab7 Series (Latest - Best Performance)
  ABAB7_CHAT_PREVIEW: 'abab7-chat-preview',  // Most advanced, preview access
  
  // abab6.5 Series (Stable Production)
  ABAB6_5S_CHAT: 'abab6.5s-chat',  // Stable version
  ABAB6_5G_CHAT: 'abab6.5g-chat',  // General purpose
  ABAB6_5T_CHAT: 'abab6.5t-chat',  // Turbo (fast)
  
  // abab6 Series (Legacy)
  ABAB6_CHAT: 'abab6-chat',
} as const;

/**
 * Model Recommendations by Use Case
 */
export const MINIMAX_USE_CASES = {
  // Marketing & Content (Best Creativity)
  MARKETING: MINIMAX_MODELS.ABAB7_CHAT_PREVIEW,
  
  // Clinical Analysis (Stable & Accurate)
  CLINICAL: MINIMAX_MODELS.ABAB6_5S_CHAT,
  
  // General Chat (Balanced)
  CHAT: MINIMAX_MODELS.ABAB6_5G_CHAT,
  
  // Quick Tasks (Fast)
  QUICK: MINIMAX_MODELS.ABAB6_5T_CHAT,
  
  // PT-BR Content (Best for Portuguese)
  PORTUGUESE: MINIMAX_MODELS.ABAB7_CHAT_PREVIEW,
} as const;

/**
 * Helper: Extract content from Minimax response
 */
export function extractContentFromMinimax(response: MinimaxResponse): string {
  return response.choices[0]?.message?.content || '';
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
  // Minimax pricing (approximate):
  // abab7: ~$0.50/1M tokens
  // abab6.5: ~$0.30/1M tokens
  
  const model = response.model;
  const tokens = response.usage.total_tokens;
  
  const pricePerMillion = model.includes('abab7') ? 0.50 : 0.30;
  
  return (tokens / 1_000_000) * pricePerMillion;
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
    model: MINIMAX_MODELS.ABAB7_CHAT_PREVIEW,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7, // Higher for creativity
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
    model: MINIMAX_MODELS.ABAB6_5S_CHAT,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3, // Lower for accuracy
    maxTokens: 2000,
  });

  return extractContentFromMinimax(response);
}
