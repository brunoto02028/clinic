// app/api/admin/marketing/generate-article/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { claudeGenerate } from '@/lib/claude'
import { buildSeoArticlePrompt, BPR_SYSTEM_CONTEXT } from '@/lib/marketing-prompts'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { keyword, title, wordCount = 1200, targetAudience } = body

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 })
    }

    const prompt = buildSeoArticlePrompt({ keyword, title, wordCount, targetAudience })

    const rawResponse = await claudeGenerate(
      [{ role: 'user', content: prompt }],
      { temperature: 0.5, maxTokens: 8192, systemPrompt: BPR_SYSTEM_CONTEXT }
    )

    let articleData: {
      title: string
      meta_description: string
      slug: string
      content: string
      tags: string[]
      excerpt: string
    }

    try {
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON')
      articleData = JSON.parse(jsonMatch[0])
    } catch {
      articleData = {
        title: title || `${keyword} — BPR Guide`,
        meta_description: `Expert guide on ${keyword} from BPR physiotherapy clinic in Richmond.`,
        slug: keyword.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        content: rawResponse,
        tags: [keyword],
        excerpt: rawResponse.substring(0, 200),
      }
    }

    // Ensure unique slug (check Article table)
    const existingSlug = await prisma.article.findUnique({ where: { slug: articleData.slug } })
    if (existingSlug) {
      articleData.slug = `${articleData.slug}-${Date.now().toString(36)}`
    }

    // Save to unified Article table (same as Blog Manager)
    const article = await prisma.article.create({
      data: {
        title: articleData.title,
        slug: articleData.slug,
        content: articleData.content,
        excerpt: articleData.excerpt || articleData.content.substring(0, 200),
        metaDescription: articleData.meta_description,
        tags: articleData.tags || [],
        keyword,
        generatedBy: 'CLAUDE',
        published: false,
        authorId: (session.user as any).id,
      },
    }).catch((e: Error) => { console.error('DB save failed:', e); return null })

    return NextResponse.json({
      success: true,
      article: {
        id: article?.id,
        ...articleData,
        published: false,
        word_count: articleData.content.split(/\s+/).length,
      },
    })

  } catch (error) {
    console.error('Generate article error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    )
  }
}

// GET — list all articles
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any)?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || undefined

  try {
    const articles = await prisma.article.findMany({
      where: {
        generatedBy: { not: null },
        ...(status === 'PUBLISHED' ? { published: true } : status === 'DRAFT' ? { published: false } : {}),
      },
      include: { author: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ articles })
  } catch {
    return NextResponse.json({ articles: [] })
  }
}
