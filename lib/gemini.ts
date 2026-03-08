// AI integration for social media content generation
// Delegates to the unified ai-provider layer (Gemini)

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

// ─── Superautomação: Full 30-day Calendar ───

export interface SuperAutoPost {
  day: number;
  slot: 'morning' | 'evening';
  postType: 'IMAGE' | 'CAROUSEL' | 'REEL';
  topic: string;
  hook: string;
  caption: string;
  hashtags: string[];
  suggestedTime: string;
  viralPotential: 'low' | 'medium' | 'high';
  contentPillar: string;
}

export interface SuperAutoResult {
  calendarName: string;
  strategy: string;
  posts: SuperAutoPost[];
}

export async function generateSuperAutomacao(params: {
  language?: string;
  weeks?: number;
}): Promise<SuperAutoResult> {
  const { language = 'pt-BR', weeks = 4 } = params;
  const totalDays = weeks * 7;
  const langLabel = language === 'pt-BR' ? 'Brazilian Portuguese' : 'British English';

  const prompt = `You are an elite Instagram marketing strategist for "Bruno Physical Rehabilitation" (@bruno_physical_rehabilitation) — a physical rehabilitation clinic in the UK.

CLINIC CONTEXT:
- Owner: Bruno, ex-professional footballer (played in Brazil, Germany, Sweden), had 3 major knee surgeries, now a physiotherapist in the UK
- Locations: Richmond (London) & Ipswich (Suffolk), home visits available, open every day including weekends
- Website: bpr.rehab
- Bilingual: Portuguese and English
- Services: Electrotherapy, Exercise Therapy, Foot Scan Analysis, Biomechanical Assessment (AI-powered with 33 landmarks), Therapeutic Ultrasound, MLS® Laser Therapy (Mphi 75 — £30k machine), Shockwave Therapy, Sports Injury Treatment, Chronic Pain Management, Pre & Post-Surgery Rehabilitation, Kinesiotherapy, Microcurrent Therapy (MENS), Infrared Thermography, Custom-Made Insoles (3D foot scanning)
- Differentiators: AI biomechanical analysis, MLS Laser, infrared thermography, 3D foot scanning, digital patient portal with video exercises
- Target audience: Athletes with injuries (35-55), Brazilians in UK (25-50), Chronic pain sufferers (40-65)

CONTENT PILLARS:
1. "My Story" — Bruno's football career, 3 surgeries, personal journey (emotional connection)
2. "Tech That Heals" — MLS Laser, AI biomechanics, thermography, shockwave (show equipment)
3. "Education" — Pain science, exercise tips, myth-busting, injury prevention
4. "Transformations" — Patient results, before/after, testimonials
5. "Brazilian Community" — Content specifically for Brazilians in the UK (in Portuguese)
6. "Behind the Scenes" — Clinic tour, day-in-the-life, weekend work

Generate a ${totalDays}-day Instagram content calendar with 2 posts per day (morning + evening).

Requirements:
- Write ALL captions in ${langLabel}
- Mix formats: ~40% Reels, ~35% Carousels, ~25% Single Image posts
- Each post needs a scroll-stopping hook (max 10 words) as the first line
- Captions: 150-400 characters, storytelling style, short sentences, strong CTA at end
- Hashtags: 15-20 per post, mix of popular and niche
- Mark viral potential (high for controversial/emotional/visual wow content)
- Alternate content pillars throughout the week
- Include at least 2 Portuguese-only posts per week for Brazilian audience
- End every caption with a CTA directing to bpr.rehab or "link na bio"
- Use emojis naturally but not excessively
- Week 1: Build connection ("Who is Bruno?")
- Week 2: Show technology differentials
- Week 3: Convert audience (pain solutions)
- Week 4: Scale and strong CTAs

Respond in this exact JSON format (no markdown, no code blocks):
{
  "calendarName": "Calendar name",
  "strategy": "Brief strategy overview",
  "posts": [
    {
      "day": 1,
      "slot": "morning",
      "postType": "REEL",
      "topic": "Brief topic",
      "hook": "Hook phrase max 10 words",
      "caption": "Full caption with CTA",
      "hashtags": ["tag1", "tag2"],
      "suggestedTime": "07:30",
      "viralPotential": "high",
      "contentPillar": "My Story"
    }
  ]
}`;

  const raw = await callGemini(prompt, { maxTokens: 16000, temperature: 0.9 });
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse superautomação response');

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('Invalid JSON in superautomação response');
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
