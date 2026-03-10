// app/api/admin/marketing/feedback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { claudeGenerate } from '@/lib/claude'
import { buildFeedbackAnalysisPrompt, BPR_SYSTEM_CONTEXT } from '@/lib/marketing-prompts'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '30')
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const analyzeFlag = searchParams.get('analyze') === 'true'

    // Aggregate feedback from multiple sources
    const [appointments, notes] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          status: 'COMPLETED',
          updatedAt: { gte: since },
          notes: { not: null },
        },
        select: {
          id: true,
          notes: true,
          updatedAt: true,
        },
        take: 50,
      }).catch(() => [] as Array<{ id: string; notes: string | null; updatedAt: Date }>),

      prisma.sOAPNote.findMany({
        where: {
          createdAt: { gte: since },
        },
        select: {
          id: true,
          subjective: true,
          objective: true,
          createdAt: true,
        },
        take: 30,
      }).catch(() => [] as Array<{ id: string; subjective: string | null; objective: string | null; createdAt: Date }>),
    ])

    // Normalise all feedback
    const feedbackItems = [
      ...(appointments || [])
        .filter((a): a is typeof a & { notes: string } => !!a.notes && a.notes.length > 10)
        .map((a) => ({
          text: a.notes,
          date: a.updatedAt.toISOString().split('T')[0],
          source: 'appointment_note',
          id: a.id,
        })),
      ...(notes || [])
        .filter((n) => n.subjective && n.subjective.length > 10)
        .map((n) => ({
          text: n.subjective || '',
          date: n.createdAt.toISOString().split('T')[0],
          source: 'clinical_note',
          id: n.id,
        })),
    ]

    // If analysis requested, run through Claude
    let analysis = null
    if (analyzeFlag && feedbackItems.length > 0) {
      const prompt = buildFeedbackAnalysisPrompt(feedbackItems.slice(0, 20))
      const rawResponse = await claudeGenerate(
        [{ role: 'user', content: prompt }],
        { temperature: 0.3, systemPrompt: BPR_SYSTEM_CONTEXT }
      )

      try {
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/)
        if (jsonMatch) analysis = JSON.parse(jsonMatch[0])
      } catch {
        analysis = { summary: rawResponse, error: 'Could not parse structured analysis' }
      }
    }

    const stats = {
      total_feedback: feedbackItems.length,
      by_source: feedbackItems.reduce(
        (acc, f) => { acc[f.source] = (acc[f.source] || 0) + 1; return acc },
        {} as Record<string, number>
      ),
      period_days: days,
    }

    return NextResponse.json({ feedback: feedbackItems, stats, analysis })

  } catch (error) {
    console.error('Feedback API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch feedback' },
      { status: 500 }
    )
  }
}
