// app/api/admin/marketing/content-intelligence/route.ts
// Content Intelligence Hub — Claude analyzes trends and suggests viral content
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { claudeGenerate } from '@/lib/claude'
import { BPR_SYSTEM_CONTEXT } from '@/lib/marketing-prompts'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const CONTENT_INTELLIGENCE_PROMPT = `${BPR_SYSTEM_CONTEXT}

You are a VIRAL CONTENT STRATEGIST and TREND ANALYST for BPR.
Your job is to identify trending topics, viral content opportunities, and create actionable content suggestions.

You have deep knowledge of:
- Social media algorithms (Instagram, TikTok, YouTube, LinkedIn)
- Health & wellness content that goes viral (what makes people share)
- Physiotherapy and rehabilitation trending topics
- SEO trends in health/medical space
- Content marketing best practices for clinics
- What patients actually search for online
- Seasonal health trends (e.g. "new year fitness injuries", "summer sports prep")
- Pain points that drive engagement (literal and figurative)

VIRAL CONTENT PATTERNS YOU KNOW:
- "I wish I knew this before my surgery" — regret/revelation hooks
- "Why your physio might be wrong about..." — contrarian takes
- "3 exercises that changed my patients' lives" — transformation stories
- "The hidden cause of your back pain" — mystery/discovery
- "I'm a physio and here's what I'd never do" — insider knowledge
- Myth-busting content — "Stop stretching your hamstrings if..."
- Before/after transformations (posture, mobility)
- Quick tips with visual demonstrations
- Patient success stories (anonymised)
- Behind-the-scenes clinic technology (MLS laser, AI posture analysis)
- Relatable pain content with humor
- "Save this for later" educational carousels

MARKETPLACE INTELLIGENCE:
- Identify which topics would make good PDF guides to sell
- Suggest Amazon affiliate products that align with content topics
- Think about content-to-product funnels (free post → paid guide)
- Consider what patients would pay money to learn about

Always think in terms of CONTENT FUNNELS:
Instagram Post (awareness) → Blog Article (SEO) → PDF Guide (revenue) → Clinic Booking (service)
`

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { action } = body

    if (action === 'trending-ideas') {
      return generateTrendingIdeas(body)
    } else if (action === 'content-calendar') {
      return generateContentCalendar(body)
    } else if (action === 'viral-hooks') {
      return generateViralHooks(body)
    } else if (action === 'marketplace-opportunities') {
      return generateMarketplaceOpportunities(body)
    } else if (action === 'improve-content') {
      return improveExistingContent(body)
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('[content-intelligence] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}

async function generateTrendingIdeas(body: any) {
  const { focus, count = 10 } = body

  const prompt = `
TASK: Generate ${count} TRENDING content ideas for BPR right now.

${focus ? `FOCUS AREA: "${focus}"` : 'FOCUS: General physiotherapy, rehabilitation, pain management, sports recovery, wellness'}

For each idea, provide:

RESPOND IN JSON FORMAT:
{
  "ideas": [
    {
      "title": "Compelling title/headline",
      "hook": "First line that grabs attention (Instagram caption opener or article intro)",
      "whyViral": "Why this topic is trending or has viral potential right now",
      "platforms": ["instagram", "blog", "pdf", "tiktok"],
      "contentType": "post|carousel|reel|article|guide|video",
      "category": "pain_management|sports_recovery|posture|exercise|technology|lifestyle|myth_busting|patient_stories|behind_scenes",
      "urgency": "high|medium|low",
      "estimatedEngagement": "high|medium|low",
      "monetization": "Description of how this content can lead to revenue (PDF upsell, booking, affiliate product)",
      "hashtags": ["#tag1", "#tag2", "#tag3"],
      "bestTimeToPost": "e.g. Monday morning, Weekend evening",
      "affiliateOpportunity": "Relevant Amazon product to link (or null)",
      "pdfOpportunity": "Could this become a paid PDF guide? Brief description (or null)"
    }
  ],
  "trendingSummary": "Brief paragraph about what's trending in the physiotherapy/health space right now",
  "seasonalNote": "Any seasonal opportunities to leverage right now"
}

REQUIREMENTS:
- Ideas must feel FRESH and CURRENT, not generic
- Each idea should have a clear content-to-revenue funnel path
- Mix of quick-win content (posts) and long-form (articles, PDFs)
- Include at least 2 myth-busting ideas (these always go viral)
- Include at least 1 technology showcase idea (BPR's AI, laser, etc.)
- Include at least 1 "Bruno's personal story" angle
- Think about what patients are ACTUALLY searching for right now
- UK market focus but globally relevant content`

  const raw = await claudeGenerate(
    [{ role: 'user', content: prompt }],
    { temperature: 0.8, maxTokens: 8192, systemPrompt: CONTENT_INTELLIGENCE_PROMPT }
  )

  let data: any
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON')
    data = JSON.parse(match[0])
  } catch {
    return NextResponse.json({ error: 'AI response was invalid. Try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, ...data })
}

async function generateContentCalendar(body: any) {
  const { weeks = 2, focus } = body

  const prompt = `
TASK: Create a ${weeks}-week CONTENT CALENDAR for BPR.

${focus ? `FOCUS AREA: "${focus}"` : ''}

RESPOND IN JSON FORMAT:
{
  "calendar": [
    {
      "week": 1,
      "theme": "Weekly theme (e.g. 'Back Pain Awareness Week')",
      "days": [
        {
          "day": "Monday",
          "platform": "instagram",
          "contentType": "carousel|reel|post|story",
          "title": "Content title",
          "caption": "Full caption text with emojis and hashtags (ready to copy-paste)",
          "notes": "Production notes (e.g. 'Film Bruno demonstrating', 'Use posture analysis screenshot')",
          "cta": "Call to action (e.g. 'Book a free assessment', 'Download our guide', 'Link in bio')",
          "linkedProduct": "If this promotes a PDF guide or affiliate product, name it"
        },
        {
          "day": "Wednesday", 
          "platform": "blog",
          "contentType": "article",
          "title": "SEO article title",
          "outline": "Brief 3-5 point outline",
          "targetKeyword": "Main SEO keyword to target",
          "notes": "Any specific angle or data to include"
        },
        {
          "day": "Friday",
          "platform": "instagram",
          "contentType": "reel",
          "title": "Reel concept",
          "script": "Brief script/storyboard",
          "audio": "Suggested trending audio or voice-over approach",
          "notes": "Production notes"
        }
      ]
    }
  ],
  "strategyNotes": "Overall strategy explanation for the period",
  "kpis": ["KPI to track 1", "KPI to track 2"]
}

REQUIREMENTS:
- 3-4 posts per week across platforms
- Mix of content types (carousel, reel, article, story)
- Each week has a cohesive theme
- Include at least 1 blog article per week (for SEO)
- Include marketplace product mentions where natural
- Instagram captions should be READY TO COPY-PASTE (with emojis, line breaks, hashtags)
- Think about content batching (multiple pieces from one production session)
- Include "content pillars" rotation: Education, Personal Story, Technology, Patient Results, Lifestyle`

  const raw = await claudeGenerate(
    [{ role: 'user', content: prompt }],
    { temperature: 0.7, maxTokens: 12000, systemPrompt: CONTENT_INTELLIGENCE_PROMPT }
  )

  let data: any
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON')
    data = JSON.parse(match[0])
  } catch {
    return NextResponse.json({ error: 'AI response was invalid. Try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, ...data })
}

async function generateViralHooks(body: any) {
  const { topic, platform = 'instagram', count = 15 } = body

  const prompt = `
TASK: Generate ${count} VIRAL HOOKS for ${platform} about "${topic || 'physiotherapy and rehabilitation'}".

A "hook" is the first line or first 3 seconds that makes someone STOP scrolling and pay attention.

RESPOND IN JSON FORMAT:
{
  "hooks": [
    {
      "hook": "The actual hook text (first line/sentence)",
      "type": "question|shock|contrarian|curiosity|story|statistic|challenge|myth_bust|confession",
      "platform": "${platform}",
      "followUp": "Brief suggestion for what comes after the hook (2-3 sentences)",
      "viralScore": 1-10,
      "why": "Why this hook works psychologically"
    }
  ],
  "tips": ["General tip for writing hooks for ${platform}"]
}

HOOK PSYCHOLOGY:
- Curiosity gap (make them NEED to know more)
- Pattern interrupt (say something unexpected)
- Specificity (numbers and specific claims beat vague ones)
- Identity (speak to who they ARE, not what they should DO)
- Emotional triggers (fear, surprise, relief, validation)
- Contrarian takes (challenge common beliefs)

EXAMPLES OF GREAT HOOKS:
- "I've treated 2,000+ patients and THIS is the #1 mistake I see"
- "Your back pain isn't actually coming from your back"
- "Stop doing this exercise if you have knee pain (seriously)"
- "3 things I'd never do as a physiotherapist"
- "The exercise that changed my practice forever"`

  const raw = await claudeGenerate(
    [{ role: 'user', content: prompt }],
    { temperature: 0.9, maxTokens: 6000, systemPrompt: CONTENT_INTELLIGENCE_PROMPT }
  )

  let data: any
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON')
    data = JSON.parse(match[0])
  } catch {
    return NextResponse.json({ error: 'AI response was invalid. Try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, ...data })
}

async function generateMarketplaceOpportunities(body: any) {
  const prompt = `
TASK: Analyze the current health/physiotherapy market and suggest MARKETPLACE OPPORTUNITIES for BPR.

RESPOND IN JSON FORMAT:
{
  "pdfGuides": [
    {
      "title": "Suggested PDF guide title",
      "description": "What it would cover",
      "targetAudience": "Who would buy this",
      "suggestedPrice": 9.99,
      "demandSignal": "Why there's demand for this (search trends, common patient questions, etc.)",
      "competitorGap": "What existing products miss that BPR can do better",
      "estimatedMonthlyRevenue": "Conservative estimate",
      "contentOutline": ["Chapter 1: ...", "Chapter 2: ...", "Chapter 3: ..."],
      "marketingAngle": "How to promote this guide"
    }
  ],
  "affiliateProducts": [
    {
      "productName": "Product name",
      "category": "equipment|supplement|book|tool|wearable",
      "whyRecommend": "Why BPR should promote this",
      "estimatedCommission": "4-10%",
      "contentIdea": "How to naturally promote this (e.g. 'Best foam rollers for back pain' article)",
      "searchVolume": "high|medium|low"
    }
  ],
  "bundleIdeas": [
    {
      "name": "Bundle name",
      "includes": ["Item 1", "Item 2"],
      "price": 29.99,
      "value": "Why this bundle is attractive"
    }
  ],
  "marketInsights": "Overall analysis of the physiotherapy digital product market"
}

FOCUS:
- PDF guides that solve SPECIFIC problems (not generic health advice)
- Amazon affiliate products that BPR can authentically recommend
- Bundle opportunities (e.g. PDF + recommended products)
- Seasonal opportunities (injury prevention before sport seasons, etc.)
- High-demand, low-competition niches in physiotherapy content`

  const raw = await claudeGenerate(
    [{ role: 'user', content: prompt }],
    { temperature: 0.7, maxTokens: 8192, systemPrompt: CONTENT_INTELLIGENCE_PROMPT }
  )

  let data: any
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON')
    data = JSON.parse(match[0])
  } catch {
    return NextResponse.json({ error: 'AI response was invalid. Try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, ...data })
}

async function improveExistingContent(body: any) {
  const { content, platform, goal } = body

  if (!content) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }

  const prompt = `
TASK: Improve this existing content to make it MORE VIRAL and ENGAGING.

PLATFORM: ${platform || 'instagram'}
GOAL: ${goal || 'increase engagement and reach'}

ORIGINAL CONTENT:
"""
${content}
"""

RESPOND IN JSON FORMAT:
{
  "improvedVersion": "The rewritten/improved content (full text, ready to use)",
  "changes": [
    {
      "what": "What was changed",
      "why": "Why this change improves performance"
    }
  ],
  "alternativeVersions": [
    {
      "style": "e.g. 'More personal', 'More provocative', 'More educational'",
      "content": "Alternative version"
    }
  ],
  "seoKeywords": ["keyword1", "keyword2"],
  "suggestedHashtags": ["#tag1", "#tag2"],
  "engagementScore": {
    "original": 1-10,
    "improved": 1-10,
    "explanation": "Why the improved version scores higher"
  },
  "tips": ["Specific tip for this type of content"]
}

IMPROVEMENT CHECKLIST:
- Stronger hook (first line must STOP the scroll)
- Clear value proposition (what does the reader GET?)
- Emotional triggers (pain points, aspirations, fears, relief)
- Call to action (what should they DO next?)
- Social proof or authority markers
- Specificity over vagueness
- Conversational tone (write like you talk)
- Line breaks and formatting for readability
- Strategic emoji use (not too many, not too few)
- Hashtag strategy`

  const raw = await claudeGenerate(
    [{ role: 'user', content: prompt }],
    { temperature: 0.7, maxTokens: 6000, systemPrompt: CONTENT_INTELLIGENCE_PROMPT }
  )

  let data: any
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON')
    data = JSON.parse(match[0])
  } catch {
    return NextResponse.json({ error: 'AI response was invalid. Try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, ...data })
}
