// AI integration for social media content generation
// Now delegates to the unified ai-provider layer (supports Gemini + Abacus with fallback)

import { callAI, parseAIJson } from '@/lib/ai-provider';

async function callGemini(prompt: string, opts?: { temperature?: number; maxTokens?: number }): Promise<string> {
  return callAI(prompt, {
    temperature: opts?.temperature,
    maxTokens: opts?.maxTokens ?? 1024,
  });
}

// ─── Public API ───

export interface GeneratedCaption {
  caption: string;
  hashtags: string[];
  callToAction: string;
}

export async function generateCaption(params: {
  topic: string;
  tone?: string;
  clinicName?: string;
  services?: string[];
  targetAudience?: string;
  language?: string;
}): Promise<GeneratedCaption> {
  const {
    topic,
    tone = 'professional yet friendly',
    clinicName = 'our clinic',
    services = [],
    targetAudience = 'patients and potential clients',
    language = 'British English',
  } = params;

  const prompt = `You are a social media marketing expert for a physical rehabilitation clinic called "${clinicName}".

Generate an Instagram post about: "${topic}"

Requirements:
- Write in ${language}
- Tone: ${tone}
- Target audience: ${targetAudience}
${services.length > 0 ? `- Services to highlight: ${services.join(', ')}` : ''}
- Keep the caption between 100-300 characters (Instagram optimal length)
- Include a clear call-to-action
- Generate 15-20 relevant hashtags (mix of popular and niche)

Respond in this exact JSON format (no markdown, no code blocks):
{
  "caption": "Your engaging caption here",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
  "callToAction": "Book your free consultation today!"
}`;

  const raw = await callGemini(prompt);

  // Parse JSON from response (handle potential markdown wrapping)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse Gemini response as JSON');

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('Invalid JSON in Gemini response');
  }
}

export interface GeneratedCampaign {
  name: string;
  description: string;
  posts: Array<{
    dayOffset: number;
    topic: string;
    caption: string;
    hashtags: string[];
    suggestedTime: string;
  }>;
}

export async function generateCampaign(params: {
  goal: string;
  duration: 'week' | '2weeks' | 'month';
  clinicName?: string;
  services?: string[];
  language?: string;
}): Promise<GeneratedCampaign> {
  const {
    goal,
    duration,
    clinicName = 'our clinic',
    services = [],
    language = 'British English',
  } = params;

  const postsCount = duration === 'week' ? 5 : duration === '2weeks' ? 10 : 20;

  const prompt = `You are a social media marketing expert for a physical rehabilitation clinic called "${clinicName}".

Generate a complete Instagram marketing campaign.

Goal: "${goal}"
Duration: ${duration === 'week' ? '1 week' : duration === '2weeks' ? '2 weeks' : '1 month'}
Number of posts: ${postsCount}
Language: ${language}
${services.length > 0 ? `Services: ${services.join(', ')}` : ''}

For each post, vary the content type: educational tips, patient testimonials concepts, service promotions, behind-the-scenes, motivational quotes, and seasonal content.

Respond in this exact JSON format (no markdown, no code blocks):
{
  "name": "Campaign Name",
  "description": "Brief campaign description",
  "posts": [
    {
      "dayOffset": 0,
      "topic": "Brief topic description",
      "caption": "Full Instagram caption (100-300 chars)",
      "hashtags": ["hashtag1", "hashtag2"],
      "suggestedTime": "10:00"
    }
  ]
}`;

  const raw = await callGemini(prompt);
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse campaign response');

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('Invalid JSON in campaign response');
  }
}

export async function generateHashtags(params: {
  topic: string;
  count?: number;
  niche?: string;
}): Promise<string[]> {
  const { topic, count = 20, niche = 'physical therapy and rehabilitation' } = params;

  const prompt = `Generate exactly ${count} Instagram hashtags for a post about "${topic}" in the ${niche} niche.

Mix popular hashtags (100k+ posts), medium hashtags (10k-100k posts), and niche hashtags (<10k posts) for optimal reach.

Respond with only a JSON array of strings (no markdown, no code blocks):
["hashtag1", "hashtag2", "hashtag3"]`;

  const raw = await callGemini(prompt);
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Failed to parse hashtags response');

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('Invalid JSON in hashtags response');
  }
}

// ─── Exercise Voice-to-Form ───

export interface ParsedExerciseData {
  name?: string;
  description?: string;
  instructions?: string;
  bodyRegion?: string;
  difficulty?: string;
  tags?: string[];
  defaultSets?: number;
  defaultReps?: number;
  defaultHoldSec?: number;
  defaultRestSec?: number;
}

export async function parseExerciseFromVoice(
  transcript: string,
  outputLanguage: 'en' | 'pt' = 'en'
): Promise<ParsedExerciseData> {
  const langLabel = outputLanguage === 'pt' ? 'Brazilian Portuguese (pt-BR)' : 'English';
  const langExamples = outputLanguage === 'pt'
    ? `name: "Rotação Externa de Ombro com Faixa", description in Portuguese, instructions in Portuguese, tags in Portuguese (e.g. "fortalecimento", "mobilidade")`
    : `name: "Shoulder External Rotation with Band", description in English, instructions in English, tags in English (e.g. "strengthening", "mobility")`;

  const prompt = `You are a clinical exercise data extraction assistant. The user (a physiotherapist) dictated the following text to fill an exercise form. Extract structured data from the transcript.

Transcript: "${transcript}"

Valid bodyRegion values (ALWAYS use these exact enum strings): SHOULDER, ELBOW, WRIST_HAND, HIP, KNEE, ANKLE_FOOT, SPINE_BACK, NECK_CERVICAL, CORE_ABDOMEN, STRETCHING, MUSCLE_INJURY, FULL_BODY, OTHER
Valid difficulty values (ALWAYS use these exact enum strings): BEGINNER, INTERMEDIATE, ADVANCED

Output language for name, description, instructions, and tags: ${langLabel}
Example: ${langExamples}

Rules:
- The transcript may be in Portuguese (pt-BR) or English. Understand both.
- bodyRegion and difficulty must ALWAYS be the English enum values listed above (never translate these).
- Map Portuguese body terms: ombro→SHOULDER, cotovelo→ELBOW, mão/punho→WRIST_HAND, quadril→HIP, joelho→KNEE, tornozelo/pé→ANKLE_FOOT, coluna/costas→SPINE_BACK, pescoço/cervical→NECK_CERVICAL, abdômen/core→CORE_ABDOMEN, alongamento→STRETCHING, lesão muscular→MUSCLE_INJURY
- Map difficulty terms: iniciante/básico→BEGINNER, intermediário→INTERMEDIATE, avançado→ADVANCED
- Write name, description, instructions, and tags in ${langLabel}.
- For instructions, write clear step-by-step numbered instructions based on what the user described.
- Only include fields that were mentioned or can be clearly inferred. Set missing fields to null.
- Numbers for sets, reps, hold seconds, rest seconds should be integers.

Respond in this exact JSON format (no markdown, no code blocks):
{
  "name": "Exercise Name",
  "description": "Brief description",
  "instructions": "Step by step instructions",
  "bodyRegion": "SHOULDER",
  "difficulty": "BEGINNER",
  "tags": ["tag1", "tag2"],
  "defaultSets": 3,
  "defaultReps": 12,
  "defaultHoldSec": null,
  "defaultRestSec": null
}`;

  const raw = await callGemini(prompt);
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse voice transcript into exercise data');

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    // Clean nulls
    const result: ParsedExerciseData = {};
    if (parsed.name) result.name = parsed.name;
    if (parsed.description) result.description = parsed.description;
    if (parsed.instructions) result.instructions = parsed.instructions;
    if (parsed.bodyRegion) result.bodyRegion = parsed.bodyRegion;
    if (parsed.difficulty) result.difficulty = parsed.difficulty;
    if (parsed.tags && parsed.tags.length > 0) result.tags = parsed.tags;
    if (parsed.defaultSets != null) result.defaultSets = parseInt(parsed.defaultSets);
    if (parsed.defaultReps != null) result.defaultReps = parseInt(parsed.defaultReps);
    if (parsed.defaultHoldSec != null) result.defaultHoldSec = parseInt(parsed.defaultHoldSec);
    if (parsed.defaultRestSec != null) result.defaultRestSec = parseInt(parsed.defaultRestSec);
    return result;
  } catch {
    throw new Error('Invalid JSON in voice parse response');
  }
}

export async function improveCaption(params: {
  caption: string;
  instruction?: string;
}): Promise<string> {
  const { caption, instruction = 'Make it more engaging and add emojis' } = params;

  const prompt = `Improve this Instagram caption. ${instruction}

Original caption: "${caption}"

Respond with only the improved caption text (no JSON, no markdown, no quotes).`;

  return callGemini(prompt);
}
