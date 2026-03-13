import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'
import { claudeGenerate } from '@/lib/claude'
import { BPR_SYSTEM_CONTEXT } from '@/lib/marketing-prompts'

// POST /api/admin/marketing/content-calendar
// Generate a full month of Instagram posts
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      startDate,
      postsPerWeek = 7,
      language = 'en',
      themes = [],
      includeMarketplace = true,
      includeArticles = true,
    } = await req.json()

    const start = startDate ? new Date(startDate) : new Date()
    const totalDays = 30
    const totalPosts = Math.min(postsPerWeek * 4, 30)

    const langNote = language === 'pt' ? 'Write all captions in Portuguese (pt-BR).'
      : language === 'both' ? 'Write captions in English with Portuguese translation below.'
      : 'Write all captions in English (UK spelling).'

    const themesNote = themes.length > 0 ? `Focus themes: ${themes.join(', ')}` : 'Mix of all BPR services and topics'

    // Generate in batches of 10 to avoid token/parse issues
    const BATCH_SIZE = 10
    const batches = Math.ceil(totalPosts / BATCH_SIZE)
    const allPosts: any[] = []

    for (let b = 0; b < batches; b++) {
      const batchStart = b * BATCH_SIZE
      const batchCount = Math.min(BATCH_SIZE, totalPosts - batchStart)
      const batchFromDate = new Date(start)
      batchFromDate.setDate(batchFromDate.getDate() + Math.round(batchStart * (30 / totalPosts)))

      const prompt = `You are a content strategist for BPR (Bruno Physical Rehabilitation), UK.

Create EXACTLY ${batchCount} Instagram posts (batch ${b + 1} of ${batches}).
Start date for this batch: ${batchFromDate.toISOString().split('T')[0]}.
Post frequency: ${postsPerWeek} posts per week.
${langNote}
${themesNote}

BPR Assets: MLS Laser, Custom Insoles, Biomechanics, Thermography, Shockwave, Sports Recovery, Foot Scan, Posture.
Website: bpr.rehab
${includeMarketplace ? 'Include marketplace/PDF product mentions.' : ''}
${includeArticles ? 'Include blog article promotions.' : ''}

Rules:
- Mix content types: REEL, CAROUSEL, IMAGE
- Mix tones: educational, motivational, testimonial, promotional, behind_scenes
- Best times: 7:30, 12:00, 18:30

Return ONLY a JSON array of exactly ${batchCount} objects, no other text:
[{"day":${batchStart + 1},"date":"YYYY-MM-DD","day_of_week":"Monday","post_time":"07:30","content_type":"REEL","tone":"educational","topic":"title","hook":"first line","caption":"full caption","hashtags":["#tag"],"visual_direction":"what to show","bpr_connection":"link to asset","service":"MLS Laser"}]`

      const raw = await claudeGenerate(
        [{ role: 'user', content: prompt }],
        { temperature: 0.85, maxTokens: 4000, systemPrompt: BPR_SYSTEM_CONTEXT }
      )

      try {
        const jsonMatch = raw.match(/\[[\s\S]*\]/)
        if (!jsonMatch) throw new Error('No JSON array in batch ' + b)
        const batch = JSON.parse(jsonMatch[0])
        allPosts.push(...batch)
      } catch (parseErr) {
        console.error('[calendar] batch parse error:', parseErr)
        // Skip failed batch, continue
      }
    }

    if (allPosts.length === 0) {
      return NextResponse.json({ error: 'Failed to generate posts. Try again.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, posts: allPosts, totalPosts: allPosts.length })
  } catch (error: any) {
    console.error('Content calendar error:', error)
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 })
  }
}

// GET /api/admin/marketing/content-calendar — list scheduled posts
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = session.user as any
    const clinicId = user.clinicId

    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const posts = await prisma.socialPost.findMany({
      where: {
        clinicId,
        status: { in: ['SCHEDULED', 'DRAFT', 'PUBLISHED'] },
        ...(from && to ? {
          scheduledAt: {
            gte: new Date(from),
            lte: new Date(to),
          }
        } : {}),
      },
      orderBy: { scheduledAt: 'asc' },
      select: {
        id: true,
        caption: true,
        postType: true,
        status: true,
        scheduledAt: true,
        publishedAt: true,
        mediaUrls: true,
        aiGenerated: true,
        aiPrompt: true,
      }
    })

    return NextResponse.json({ posts })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}
