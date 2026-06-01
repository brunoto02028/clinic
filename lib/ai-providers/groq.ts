/**
 * Groq AI Provider
 * Ultra-fast inference with Llama models and Whisper
 */

export interface GroqChatParams {
  model?: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
}

export interface GroqWhisperParams {
  audio: Buffer | Blob;
  model?: string;
  language?: string;
  temperature?: number;
  prompt?: string;
}

export interface GroqResponse {
  id: string;
  object: string;
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
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Call Groq Chat Completion API
 * Supports: Llama 3.3 70B, Llama 3.1 70B, Mixtral, Gemma
 */
export async function callGroq({
  model = 'llama-3.3-70b-versatile',
  messages,
  temperature = 0.1,
  maxTokens = 8000,
  topP = 1.0,
  stream = false,
}: GroqChatParams): Promise<GroqResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured in environment variables');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Groq] API error:', errorText);
    throw new Error(`Groq API error (${response.status}): ${errorText}`);
  }

  return await response.json();
}

/**
 * Transcribe audio with Groq Whisper
 * Models: whisper-large-v3, whisper-large-v3-turbo
 * Supports 99 languages with high accuracy
 */
export async function transcribeWithGroqWhisper({
  audio,
  model = 'whisper-large-v3',
  language,
  temperature = 0.0,
  prompt,
}: GroqWhisperParams): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured in environment variables');
  }

  // Create FormData for multipart upload
  const formData = new FormData();
  
  // Convert Buffer to Blob if needed
  const audioBlob = audio instanceof Buffer 
    ? new Blob([new Uint8Array(audio)], { type: 'audio/webm' })
    : audio;
  
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', model);
  formData.append('temperature', temperature.toString());
  formData.append('response_format', 'json');
  
  if (language) {
    formData.append('language', language);
  }
  
  if (prompt) {
    formData.append('prompt', prompt);
  }

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Groq Whisper] API error:', errorText);
    throw new Error(`Groq Whisper API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  return result.text || '';
}

/**
 * Available Groq Models
 */
export const GROQ_MODELS = {
  // Llama 3.3 (Latest, Best)
  LLAMA_3_3_70B_VERSATILE: 'llama-3.3-70b-versatile',
  LLAMA_3_3_70B_SPECDEC: 'llama-3.3-70b-specdec',
  
  // Llama 3.1 (Stable)
  LLAMA_3_1_70B_VERSATILE: 'llama-3.1-70b-versatile',
  LLAMA_3_1_8B_INSTANT: 'llama-3.1-8b-instant',
  
  // Mixtral (Multilingual)
  MIXTRAL_8X7B: 'mixtral-8x7b-32768',
  
  // Gemma (Google)
  GEMMA_2_9B: 'gemma2-9b-it',
  GEMMA_7B: 'gemma-7b-it',
  
  // Whisper (Audio)
  WHISPER_LARGE_V3: 'whisper-large-v3',
  WHISPER_LARGE_V3_TURBO: 'whisper-large-v3-turbo',
} as const;

/**
 * Model Recommendations by Use Case
 */
export const GROQ_USE_CASES = {
  // Biomechanical Analysis (High Precision)
  BIOMECHANICS: GROQ_MODELS.LLAMA_3_3_70B_SPECDEC,
  
  // General Chat (Fast & Accurate)
  CHAT: GROQ_MODELS.LLAMA_3_3_70B_VERSATILE,
  
  // Quick Tasks (Ultra Fast)
  QUICK: GROQ_MODELS.LLAMA_3_1_8B_INSTANT,
  
  // Multilingual (Best for PT-BR)
  MULTILINGUAL: GROQ_MODELS.MIXTRAL_8X7B,
  
  // Audio Transcription (Best Quality)
  TRANSCRIPTION: GROQ_MODELS.WHISPER_LARGE_V3,
  
  // Audio Transcription (Fast)
  TRANSCRIPTION_FAST: GROQ_MODELS.WHISPER_LARGE_V3_TURBO,
} as const;

/**
 * Helper: Extract JSON from Groq response
 */
export function extractJsonFromGroq(response: GroqResponse): any {
  const content = response.choices[0]?.message?.content || '';
  
  // Try to find JSON in response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('[Groq] Failed to parse JSON:', e);
    }
  }
  
  return { rawResponse: content };
}

/**
 * Helper: Calculate cost estimate
 */
export function estimateGroqCost(response: GroqResponse): number {
  // Groq pricing (approximate):
  // Llama 3.3 70B: $0.59/1M input, $0.79/1M output
  // Whisper: $0.111/hour
  
  const inputCost = (response.usage.prompt_tokens / 1_000_000) * 0.59;
  const outputCost = (response.usage.completion_tokens / 1_000_000) * 0.79;
  
  return inputCost + outputCost;
}
