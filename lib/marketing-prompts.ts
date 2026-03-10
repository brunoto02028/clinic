// lib/marketing-prompts.ts
// Prompts especializados para a BPR — optimizados para Qwen3-Coder:30b

export const BPR_SYSTEM_CONTEXT = `
You are the marketing AI for BPR (Bruno Physical Rehabilitation), a premium physiotherapy and rehabilitation clinic in Richmond/Ipswich, UK.

CLINIC IDENTITY:
- Founded by Bruno, a former professional footballer who played in Brazil, Germany and Sweden
- Bruno underwent 3 major knee surgeries — he understands rehabilitation from personal experience
- Services: MLS Laser Therapy (Mphi 75), Custom Insoles & Foot Scans, Biomechanical Assessment (AI-powered), Infrared Thermography, Electrotherapy, Exercise Therapy, Sports Injury Treatment, Chronic Pain Management, Pre/Post Surgery Rehab, Kinesiotherapy, Microcurrent Therapy
- Technology edge: AI posture analysis with 33 body landmarks, infrared thermography, MLS dual-wavelength laser
- Tone: Expert but approachable. Evidence-based. Human. Never salesy or generic.
- Target audience: Active adults 25-60, athletes, post-surgery patients, chronic pain sufferers, sports clubs
- Location: Richmond TW10 6AQ & Ipswich, Suffolk, UK
- Website: bpr.rehab
- Open every day including weekends

Always write content that feels personal, expert, and genuine. Reference Bruno's story when relevant.
`

// ─── INSTAGRAM POST PROMPTS ───────────────────────────────────────────────

export function buildInstagramPostPrompt(params: {
  topic: string
  service?: string
  language?: 'en' | 'pt' | 'both'
  tone?: 'educational' | 'motivational' | 'testimonial' | 'promotional'
  includeHashtags?: boolean
}): string {
  const {
    topic,
    service,
    language = 'en',
    tone = 'educational',
    includeHashtags = true,
  } = params

  const toneGuide = {
    educational: 'informative and expert, teaching the audience something valuable',
    motivational: 'inspiring and energetic, encouraging the audience in their recovery journey',
    testimonial: 'warm and human, sharing a patient success story (anonymised)',
    promotional: 'clear value proposition, soft sell, highlighting what makes BPR unique',
  }

  const langGuide =
    language === 'both'
      ? 'Write in English first, then provide a Portuguese (PT-BR) version below it.'
      : language === 'pt'
      ? 'Write in Portuguese (PT-BR).'
      : 'Write in English (UK spelling).'

  return `
${BPR_SYSTEM_CONTEXT}

TASK: Create an Instagram post for BPR.

Topic: ${topic}
${service ? `Service to highlight: ${service}` : ''}
Tone: ${toneGuide[tone]}
Language: ${langGuide}

REQUIREMENTS:
- Caption: 150-220 words max
- Start with a strong hook (first line must stop scrolling)
- Include 1-2 emojis max (professional, not childish)
- End with a clear but soft call to action (book at bpr.rehab or link in bio)
- ${includeHashtags ? 'Include 15-20 relevant hashtags at the end (mix broad and niche)' : 'No hashtags'}
- Never use generic phrases like "Are you suffering?" or "Don't let pain hold you back"
- Feel like it was written by Bruno himself, not a marketing agency

Also provide:
VISUAL SUGGESTION: One sentence describing the ideal image or video for this post
IMAGE_PROMPT: A detailed prompt for AI image generation (for FLUX model)

Format your response as JSON:
{
  "caption": "...",
  "hashtags": ["#tag1", "#tag2"],
  "visual_suggestion": "...",
  "image_prompt": "...",
  "caption_pt": "..." // only if language is "both"
}
`
}

// ─── SEO ARTICLE PROMPTS ──────────────────────────────────────────────────

export function buildSeoArticlePrompt(params: {
  keyword: string
  title?: string
  wordCount?: number
  targetAudience?: string
}): string {
  const {
    keyword,
    title,
    wordCount = 1200,
    targetAudience = 'adults in Richmond and Ipswich UK seeking physiotherapy',
  } = params

  return `
${BPR_SYSTEM_CONTEXT}

TASK: Write a comprehensive SEO blog article for bpr.rehab

Primary keyword: "${keyword}"
${title ? `Suggested title: ${title}` : ''}
Target word count: ~${wordCount} words
Target audience: ${targetAudience}

SEO REQUIREMENTS:
- Title: Include primary keyword, compelling, under 60 characters
- Meta description: 150-160 characters, include keyword, compelling CTA
- Use H2 and H3 subheadings naturally
- Include the keyword naturally 4-6 times (no stuffing)
- Include 2-3 related keywords/phrases
- Local SEO: mention Richmond, Ipswich, Surrey, Suffolk where natural
- End with a clear CTA to book at BPR

CONTENT REQUIREMENTS:
- Evidence-based — cite general medical consensus (no specific studies needed)
- Include Bruno's personal story/perspective where relevant
- Practical tips the reader can use immediately
- Explain what BPR offers for this specific condition
- Conversational but expert tone

Format as JSON:
{
  "title": "...",
  "meta_description": "...",
  "slug": "url-friendly-slug",
  "content": "Full markdown article here...",
  "tags": ["tag1", "tag2"],
  "excerpt": "2-3 sentence summary for blog listing page"
}
`
}

// ─── PDF EDUCATIONAL CONTENT PROMPTS ─────────────────────────────────────

export function buildPdfContentPrompt(params: {
  title: string
  topic: string
  audience: string
  pages?: number
  includeExercises?: boolean
}): string {
  const {
    title,
    topic,
    audience,
    pages = 12,
    includeExercises = true,
  } = params

  return `
${BPR_SYSTEM_CONTEXT}

TASK: Create content for a professional educational PDF guide to sell on bpr.rehab

Title: "${title}"
Topic: ${topic}
Target audience: ${audience}
Target length: ~${pages} pages of content
${includeExercises ? 'Include: A section with practical exercises or self-care tips' : ''}

STRUCTURE:
1. Cover page content (title, subtitle, author: Bruno — BPR)
2. Introduction (Bruno's personal note — warm, expert)
3. Main educational sections (4-6 sections)
4. ${includeExercises ? 'Exercise/self-care section with clear instructions' : 'Action plan section'}
5. When to seek professional help (soft CTA to book at BPR)
6. About Bruno & BPR (credibility section)

TONE: Professional medical guide but written in accessible language. Think NHS leaflet quality but warmer and more personal.

Format as JSON:
{
  "title": "...",
  "subtitle": "...",
  "price_suggestion": "£X.XX",
  "sections": [
    {
      "heading": "...",
      "content": "Full section content in markdown...",
      "type": "intro|educational|exercise|cta|about"
    }
  ],
  "key_takeaways": ["takeaway1", "takeaway2"],
  "target_keywords": ["keyword1", "keyword2"]
}
`
}

// ─── FEEDBACK ANALYSIS PROMPT ─────────────────────────────────────────────

export function buildFeedbackAnalysisPrompt(feedbackItems: Array<{
  text: string
  date: string
  source: string
}>): string {
  return `
${BPR_SYSTEM_CONTEXT}

TASK: Analyse the following patient feedback and provide actionable insights for BPR.

FEEDBACK DATA:
${feedbackItems.map((f, i) => `[${i + 1}] Source: ${f.source} | Date: ${f.date}\n"${f.text}"`).join('\n\n')}

Provide analysis as JSON:
{
  "overall_sentiment": "positive|neutral|negative",
  "sentiment_score": 0-100,
  "top_strengths": ["strength1", "strength2", "strength3"],
  "areas_to_improve": ["area1", "area2"],
  "action_recommendations": ["action1", "action2", "action3"],
  "google_review_ready": [indexes of feedback suitable to request Google reviews],
  "instagram_testimonial_ready": [indexes suitable for anonymised Instagram testimonials],
  "summary": "2-3 sentence executive summary"
}
`
}

// ─── WHATSAPP FOLLOW-UP PROMPTS ───────────────────────────────────────────

export function buildWhatsAppFollowUpPrompt(params: {
  patientName: string
  lastVisitDate: string
  condition: string
  daysSince: number
}): string {
  const { patientName, lastVisitDate, condition, daysSince } = params

  return `
${BPR_SYSTEM_CONTEXT}

TASK: Write a WhatsApp follow-up message for a patient.

Patient: ${patientName} (first name only in message)
Last visit: ${lastVisitDate} (${daysSince} days ago)
Condition being treated: ${condition}

Requirements:
- Under 100 words
- Warm and personal (from Bruno)
- Check how they're feeling
- Soft nudge to rebook if they haven't
- End with bpr.rehab/signup link
- Never sound automated or generic
- UK English

Return just the message text, no JSON needed.
`
}

// ─── CAMPAIGN IDEAS PROMPT ────────────────────────────────────────────────

export function buildCampaignIdeasPrompt(params: {
  month: string
  currentServices: string[]
  recentTopics: string[]
}): string {
  const { month, currentServices, recentTopics } = params

  return `
${BPR_SYSTEM_CONTEXT}

TASK: Generate a 30-day Instagram content calendar for BPR for ${month}.

Services to promote: ${currentServices.join(', ')}
Avoid repeating these recent topics: ${recentTopics.join(', ')}

Create a balanced mix of:
- Educational posts (40%)
- Service highlights (25%)
- Patient journey/motivational (20%)
- Behind the scenes / Bruno's story (15%)

Format as JSON array:
[
  {
    "day": 1,
    "date": "...",
    "post_type": "educational|service|motivational|behind_scenes",
    "topic": "...",
    "service": "...",
    "hook_idea": "First line of caption hook",
    "visual_concept": "Brief image description"
  }
]

Generate all 30 days.
`
}
