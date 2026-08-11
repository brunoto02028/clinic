import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'
import { claudeGenerate } from '@/lib/claude'
import { BPR_SYSTEM_CONTEXT } from '@/lib/marketing-prompts'
import { resolveClinicId } from '@/lib/resolve-clinic-id'

export const dynamic = 'force-dynamic';

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

    // Generate in batches of 10 to avoid token/parse issues. Each batch gets
    // its exact target dates computed here (not left to the AI to work out
    // across independent batches), so the schedule is deterministic and
    // never produces duplicate/skipped dates.
    const BATCH_SIZE = 10
    const batches = Math.ceil(totalPosts / BATCH_SIZE)
    const allPosts: any[] = []
    const failedBatches: number[] = []

    // Evenly spread `totalPosts` across the 30-day window.
    const targetDates: Date[] = []
    for (let i = 0; i < totalPosts; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + Math.round((i * totalDays) / totalPosts))
      targetDates.push(d)
    }

    for (let b = 0; b < batches; b++) {
      const batchStart = b * BATCH_SIZE
      const batchCount = Math.min(BATCH_SIZE, totalPosts - batchStart)
      const batchDates = targetDates.slice(batchStart, batchStart + batchCount)
      const dateList = batchDates
        .map((d, i) => `${batchStart + i + 1}. ${d.toISOString().split('T')[0]} (${d.toLocaleDateString('en-GB', { weekday: 'long' })})`)
        .join('\n')

      const prompt = `You are a content strategist for BPR (Bruno Physical Rehabilitation), UK.

Create EXACTLY ${batchCount} Instagram posts (batch ${b + 1} of ${batches}), one per date below — use these EXACT dates, do not invent your own:
${dateList}

Post frequency: ${postsPerWeek} posts per week.
${langNote}
${themesNote}

BPR Assets: MLS Laser, Custom Insoles, Biomechanics, Thermography, Shockwave, Sports Recovery, Foot Scan, Posture.
Website: bpr.clinic
${includeMarketplace ? 'Include marketplace/PDF product mentions.' : ''}
${includeArticles ? 'Include blog article promotions.' : ''}

Rules:
- Mix content types: REEL, CAROUSEL, IMAGE
- Mix tones: educational, motivational, testimonial, promotional, behind_scenes
- Best times: 7:30, 12:00, 18:30

Return ONLY a JSON array of exactly ${batchCount} objects, in the same order as the dates above, no other text:
[{"day":${batchStart + 1},"date":"YYYY-MM-DD","day_of_week":"Monday","post_time":"07:30","content_type":"REEL","tone":"educational","topic":"title","hook":"first line","caption":"full caption","hashtags":["#tag"],"visual_direction":"what to show","bpr_connection":"link to asset","service":"MLS Laser"}]`

      // One retry per batch — a single flaky generation shouldn't silently
      // drop a chunk of the month with no indication to the user.
      let batchPosts: any[] | null = null
      for (let attempt = 0; attempt < 2 && !batchPosts; attempt++) {
        try {
          const raw = await claudeGenerate(
            [{ role: 'user', content: prompt }],
            { temperature: 0.85, maxTokens: 4000, systemPrompt: BPR_SYSTEM_CONTEXT }
          )
          const jsonMatch = raw.match(/\[[\s\S]*\]/)
          if (!jsonMatch) throw new Error('No JSON array in response')
          const parsed = JSON.parse(jsonMatch[0])
          if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Empty/invalid array')
          batchPosts = parsed
        } catch (parseErr: any) {
          console.error(`[calendar] batch ${b} attempt ${attempt + 1} failed:`, parseErr.message)
        }
      }

      if (batchPosts) {
        // Force the deterministic dates onto whatever the AI returned, in
        // case it still drifted despite the instruction.
        batchPosts.forEach((p, i) => {
          const d = batchDates[i]
          if (d) {
            p.date = d.toISOString().split('T')[0]
            p.day_of_week = d.toLocaleDateString('en-GB', { weekday: 'long' })
          }
        })
        allPosts.push(...batchPosts)
      } else {
        failedBatches.push(b + 1)
      }
    }

    if (allPosts.length === 0) {
      return NextResponse.json({ error: 'Failed to generate posts after retries. Try again.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      posts: allPosts,
      totalPosts: allPosts.length,
      requestedPosts: totalPosts,
      failedBatches: failedBatches.length,
      partial: allPosts.length < totalPosts,
    })
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

    const clinicId = await resolveClinicId(session)

    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const posts = await prisma.socialPost.findMany({
      where: {
        ...(clinicId ? { clinicId } : {}),
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
