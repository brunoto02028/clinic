// lib/eleven-labs.ts
// ElevenLabs text-to-speech client — used for the "Listen to article" feature
// (see app/api/articles/[id]/audio/route.ts). Non-clinical, public-content
// only — never used for patient data.

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const MODEL_ID = 'eleven_multilingual_v2'; // supports English + Portuguese in one model

// Default narrator voices — override via env vars if a different voice is
// preferred, without a code change.
//
// NOTE: the account's Brazilian PT voices (e.g. "Adriano-Narrador", "Bia")
// are Voice Library additions, which ElevenLabs only allows over the API on
// a paid plan (free plan returns 402 "paid_plan_required"). "George" is one
// of the default premade voices (always API-usable) and speaks fluent
// Portuguese via eleven_multilingual_v2, so it's used for both locales until
// the plan is upgraded — at which point ELEVENLABS_VOICE_ID_PT can point to
// a native PT voice for a more natural accent.
const VOICE_IDS: Record<'en' | 'pt', string> = {
  en: process.env.ELEVENLABS_VOICE_ID_EN || 'JBFqnCBsd6RMkjVDRZzb', // "George" — warm British narrator (premade, multilingual)
  pt: process.env.ELEVENLABS_VOICE_ID_PT || 'JBFqnCBsd6RMkjVDRZzb', // same — native PT library voices need a paid plan for API use
};

// ElevenLabs charges per character and this is a synchronous request — cap
// input length so a very long article can't produce a multi-minute request
// (~5,000 characters is roughly an 8-10 minute article, plenty for a blog post).
const MAX_CHARACTERS = 5000;

export function voiceIdForLocale(locale: 'en' | 'pt'): string {
  return VOICE_IDS[locale];
}

/** Strips HTML tags/entities down to plain, speakable text. */
export function stripHtmlForSpeech(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_CHARACTERS);
}

/**
 * Generates narration audio (MP3) for the given text via ElevenLabs.
 * Throws if ELEVENLABS_API_KEY isn't configured or the API call fails.
 */
export async function generateSpeech(text: string, locale: 'en' | 'pt'): Promise<{ audio: Buffer; voiceId: string }> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY not configured in .env');
  }
  const voiceId = voiceIdForLocale(locale);

  const response = await fetch(`${ELEVENLABS_API_URL}/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error ${response.status}: ${error}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return { audio: Buffer.from(arrayBuffer), voiceId };
}
