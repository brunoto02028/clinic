// lib/marketing-image.ts
// Marketing image generation — uses Gemini via existing ai-provider
import { generateImage } from '@/lib/ai-provider'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

export const INSTAGRAM_VISUAL_TEMPLATES: Record<string, { topic: string; style: string; mood?: string }> = {
  laser_mls: {
    topic: 'MLS laser therapy treatment on knee, modern clinic, blue laser light, professional therapist',
    style: 'clinical',
  },
  foot_scan: {
    topic: 'advanced foot pressure scan analysis, digital biomechanics, clean technology aesthetic',
    style: 'clinical',
  },
  sports_recovery: {
    topic: 'athlete recovering from sports injury, physiotherapy treatment, professional sports clinic',
    style: 'sport',
  },
  exercise_therapy: {
    topic: 'physical therapist guiding patient through rehabilitation exercises, modern clinic',
    style: 'lifestyle',
  },
  thermography: {
    topic: 'infrared thermography medical imaging, heat mapping, innovative medical technology',
    style: 'educational',
  },
  pain_relief: {
    topic: 'person experiencing pain relief after physiotherapy, before and after concept, hopeful',
    style: 'lifestyle',
    mood: 'warm',
  },
  custom_insoles: {
    topic: 'custom orthopedic insoles manufacturing, precision craftsmanship, foot health technology',
    style: 'clinical',
  },
  biomechanical: {
    topic: 'full body biomechanical posture analysis, digital body landmarks overlay, medical technology',
    style: 'educational',
  },
}

const styleGuides: Record<string, string> = {
  clinical: 'modern physiotherapy clinic setting, clean white and teal colors, professional medical equipment',
  sport: 'athletic performance, sports recovery, dynamic movement, gym or field setting',
  lifestyle: 'healthy active lifestyle, natural light, wellness and wellbeing aesthetic',
  educational: 'clean infographic style, medical illustration, clear visual hierarchy, educational poster',
}

const moodGuides: Record<string, string> = {
  professional: 'professional lighting, clean composition, trustworthy medical aesthetic',
  warm: 'warm natural lighting, approachable, human connection, empathetic',
  energetic: 'dynamic composition, vibrant, high energy, motivational',
}

/**
 * Build a BPR-branded image prompt
 */
export function buildClinicImagePrompt(params: {
  topic: string
  style?: string
  mood?: string
}): string {
  const { topic, style = 'clinical', mood = 'professional' } = params

  return [
    topic,
    styleGuides[style] || styleGuides.clinical,
    moodGuides[mood] || moodGuides.professional,
    'high quality photography, instagram-ready, 4K sharp details',
    'BPR rehabilitation clinic branding, teal and navy color palette',
    'ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS, NO TYPOGRAPHY, NO CAPTIONS, NO LABELS, NO SIGNS WITH WRITING, no watermarks, no logos',
    'square 1:1 aspect ratio, 1080x1080 pixels format',
  ].join(', ')
}

/**
 * Generate a marketing image and save to disk
 * Returns the public URL of the saved image
 */
export async function generateMarketingImage(params: {
  prompt: string
  service?: string
  width?: number
  height?: number
}): Promise<string | null> {
  const { prompt, service } = params

  // Use template if service matches
  let finalPrompt = prompt
  if (service && INSTAGRAM_VISUAL_TEMPLATES[service]) {
    const template = INSTAGRAM_VISUAL_TEMPLATES[service]
    finalPrompt = buildClinicImagePrompt({
      topic: template.topic,
      style: template.style,
      mood: template.mood,
    })
  }

  try {
    const urls = await generateImage(finalPrompt, { numImages: 1 })

    if (!urls || urls.length === 0) return null

    const dataUrl = urls[0]
    if (!dataUrl.startsWith('data:image')) return null

    // Extract base64 and save to disk
    const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!match) return null

    const base64Data = match[2]

    // Optimize image with sharp before saving
    try {
      const inputBuffer = Buffer.from(base64Data, 'base64')
      
      // Convert to WebP with optimization for Instagram (1080x1080)
      const optimizedBuffer = await sharp(inputBuffer)
        .resize(1080, 1080, { 
          fit: 'cover', 
          position: 'center' 
        })
        .webp({ 
          quality: 90, // Higher quality for marketing
          effort: 4 
        })
        .toBuffer()
      
      const publicDir = path.join(process.cwd(), 'public')
      const uploadsDir = path.join(publicDir, 'uploads', 'marketing')
      
      try {
        await mkdir(uploadsDir, { recursive: true, mode: 0o755 })
      } catch (mkdirErr) {
        console.error('[marketing-image] Failed to create directory:', mkdirErr)
        return null
      }

      const slug = (service || 'post')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      const filename = `bpr-${slug}-${Date.now().toString(36)}.webp`
      const filePath = path.join(uploadsDir, filename)

      try {
        await writeFile(filePath, new Uint8Array(optimizedBuffer), { mode: 0o644 })
      } catch (writeErr) {
        console.error('[marketing-image] Failed to write file:', writeErr)
        return null
      }

      const originalSize = (base64Data.length * 0.75) / 1024
      const optimizedSize = optimizedBuffer.length / 1024
      console.log(`[marketing-image] Optimized: ${originalSize.toFixed(0)}KB → ${optimizedSize.toFixed(0)}KB`)

      return `/uploads/marketing/${filename}`
    } catch (optimizeErr) {
      console.error('[marketing-image] Optimization failed:', optimizeErr)
      return null
    }
  } catch (err) {
    console.error('[marketing-image] Generation failed:', err)
    return null
  }
}
