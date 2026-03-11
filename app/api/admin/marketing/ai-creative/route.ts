import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { callAI, generateImage, parseAIJson } from '@/lib/ai-provider'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const CLINIC_CONTEXT = `BPR (Bruno Physical Rehabilitation) is a modern physiotherapy & rehabilitation clinic in the UK (Richmond & Ipswich). Founded by Bruno, a former professional footballer who had 3 major knee surgeries. Services: MLS Laser Therapy, Custom Insoles & Foot Scans, Biomechanical Assessment (AI-powered), Sports Injury Treatment, Chronic Pain Management, Pre/Post Surgery Rehab, Shockwave Therapy, Infrared Thermography, Electrotherapy & Microcurrent, Exercise Therapy. Target audience: athletes, people with chronic pain, post-surgery patients, sports enthusiasts. Tone: professional, trustworthy, modern, empathetic. Brand colors: teal #0d7377, gold #c8952a, dark #1a2332.`

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any)?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { action, ...params } = body

  try {
    switch (action) {
      case 'write-field':
        return handleWriteField(params)
      case 'improve-text':
        return handleImproveText(params)
      case 'full-copy':
        return handleFullCopy(params)
      case 'design-direction':
        return handleDesignDirection(params)
      case 'generate-image':
        return handleGenerateImage(params)
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (error: any) {
    console.error(`[ai-creative] ${action} error:`, error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ── Write a specific field ──────────────────────────────────
async function handleWriteField({ field, context, language }: {
  field: string
  context?: { headline?: string; services?: string[]; purpose?: string }
  language?: string
}) {
  const lang = language || 'British English'
  const ctx = context || {}

  const fieldPrompts: Record<string, string> = {
    headline: `Write 3 compelling, professional flyer headlines (max 8 words each) for a physiotherapy clinic. Purpose: ${ctx.purpose || 'general marketing'}. Services: ${ctx.services?.join(', ') || 'physiotherapy'}. Language: ${lang}. Return JSON array: ["headline1","headline2","headline3"]`,
    subheadline: `Write 3 subheadlines (max 15 words each) to complement the headline "${ctx.headline || 'Expert Physiotherapy'}". Professional, compelling. Language: ${lang}. Return JSON array: ["sub1","sub2","sub3"]`,
    bodyText: `Write 3 body text paragraphs (2-3 sentences each) for a physiotherapy clinic flyer. Headline: "${ctx.headline || 'Expert Physiotherapy'}". Convey expertise, empathy, and modern technology. Language: ${lang}. Return JSON array: ["body1","body2","body3"]`,
    ctaText: `Write 5 call-to-action button texts (max 5 words each) for a physiotherapy clinic flyer. Urgent, professional. Language: ${lang}. Return JSON array: ["cta1","cta2","cta3","cta4","cta5"]`,
    tagline: `Write 3 memorable taglines (max 8 words each) for a physiotherapy clinic. Inspiring, professional. Language: ${lang}. Return JSON array: ["tag1","tag2","tag3"]`,
    promoText: `Write 3 promotional offer texts for a physiotherapy clinic flyer (e.g., "Free initial assessment", "20% off first session"). Compelling, professional. Language: ${lang}. Return JSON array: ["promo1","promo2","promo3"]`,
    // Business card specific
    title: `Write 5 professional job titles for a physiotherapy clinic founder/lead therapist. Language: ${lang}. Return JSON array: ["title1","title2","title3","title4","title5"]`,
    qualifications: `Write 3 professional qualification lines (max 50 chars) for a physiotherapist. Examples: "BSc Physiotherapy · Sports Rehab Specialist". Language: ${lang}. Return JSON array: ["q1","q2","q3"]`,
    cardTagline: `Write 3 short taglines (max 6 words) for a physiotherapy business card. Language: ${lang}. Return JSON array: ["tag1","tag2","tag3"]`,
  }

  const prompt = fieldPrompts[field]
  if (!prompt) {
    return NextResponse.json({ error: `Unknown field: ${field}` }, { status: 400 })
  }

  const raw = await callAI(prompt, {
    systemPrompt: CLINIC_CONTEXT,
    temperature: 0.9,
    maxTokens: 1024,
  })

  const suggestions = parseAIJson<string[]>(raw)
  return NextResponse.json({ suggestions })
}

// ── Improve existing text ──────────────────────────────────
async function handleImproveText({ text, field, language }: {
  text: string
  field: string
  language?: string
}) {
  const lang = language || 'British English'
  const prompt = `You are an expert copywriter for a healthcare/physiotherapy clinic. Improve this ${field} text to be more professional, compelling, and effective for print marketing. Keep the same general meaning but make it significantly better. Language: ${lang}.

Original text: "${text}"

Return exactly 3 improved versions as a JSON array: ["version1","version2","version3"]`

  const raw = await callAI(prompt, {
    systemPrompt: CLINIC_CONTEXT,
    temperature: 0.8,
    maxTokens: 1024,
  })

  const suggestions = parseAIJson<string[]>(raw)
  return NextResponse.json({ suggestions })
}

// ── Generate full copy set ──────────────────────────────────
async function handleFullCopy({ purpose, audience, tone, language }: {
  purpose?: string
  audience?: string
  tone?: string
  language?: string
}) {
  const lang = language || 'British English'
  const prompt = `You are an expert marketing copywriter. Generate complete, professional flyer copy for a physiotherapy clinic.

Purpose: ${purpose || 'General clinic marketing'}
Target audience: ${audience || 'People with pain, athletes, post-surgery patients'}
Tone: ${tone || 'Professional, empathetic, modern'}
Language: ${lang}

Generate a complete set of copy. Return as JSON:
{
  "headline": "max 8 words, powerful",
  "subheadline": "max 15 words, supporting",
  "bodyText": "2-3 sentences, compelling story",
  "ctaText": "max 5 words, action-oriented",
  "tagline": "max 8 words, memorable",
  "promoText": "optional offer or leave empty string"
}`

  const raw = await callAI(prompt, {
    systemPrompt: CLINIC_CONTEXT,
    temperature: 0.9,
    maxTokens: 1024,
  })

  const copy = parseAIJson(raw)
  return NextResponse.json({ copy })
}

// ── Design direction (colors + layout suggestion) ───────────
async function handleDesignDirection({ purpose, audience, currentLayout }: {
  purpose?: string
  audience?: string
  currentLayout?: string
}) {
  const prompt = `You are an expert graphic designer specializing in print marketing for healthcare clinics.

Suggest 3 complete design directions for a physiotherapy clinic flyer.
Purpose: ${purpose || 'General marketing'}
Audience: ${audience || 'Mixed - athletes, elderly, post-surgery'}
Current layout: ${currentLayout || 'hero-top'}

For each direction, provide:
- A short name
- Color palette (primary, secondary, accent, bg, text - all hex)
- Recommended layout from: hero-top, split, centered, gradient-diagonal, minimal, magazine, banner, photo-grid
- Brief design rationale (1 sentence)

Return as JSON array:
[{
  "name": "Direction Name",
  "colors": {"primary":"#hex","secondary":"#hex","accent":"#hex","bg":"#hex","text":"#hex"},
  "layout": "layout-name",
  "rationale": "Why this works"
}]`

  const raw = await callAI(prompt, {
    systemPrompt: CLINIC_CONTEXT,
    temperature: 0.9,
    maxTokens: 1024,
  })

  const directions = parseAIJson(raw)
  return NextResponse.json({ directions })
}

// ── Generate image ──────────────────────────────────────────
async function handleGenerateImage({ prompt, style, section }: {
  prompt: string
  style?: string
  section?: string
}) {
  const styleGuide = style || 'Professional, clean, modern healthcare aesthetic'
  const fullPrompt = `Create a professional marketing image for a physiotherapy clinic flyer. ${styleGuide}. ${prompt}. No text or words in the image. High quality, print-ready, clean composition.`

  const urls = await generateImage(fullPrompt, { numImages: 1 })

  if (!urls.length) {
    return NextResponse.json({ error: 'Image generation failed. Try a different prompt.' }, { status: 422 })
  }

  // Save to disk
  const url = urls[0]
  let imageUrl = url

  if (url.startsWith('data:image')) {
    const match = url.match(/^data:image\/\w+;base64,(.+)$/)
    if (match) {
      const baseUploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'public', 'uploads')
      const dir = path.join(baseUploadsDir, 'generated', 'marketing')
      await mkdir(dir, { recursive: true })
      const slug = (section || 'flyer').toLowerCase().replace(/[^a-z0-9]+/g, '-')
      const filename = `bpr-${slug}-${Date.now().toString(36)}.png`
      await writeFile(path.join(dir, filename), new Uint8Array(Buffer.from(match[1], 'base64')))
      imageUrl = `/uploads/generated/marketing/${filename}`
    }
  }

  return NextResponse.json({ imageUrl })
}
