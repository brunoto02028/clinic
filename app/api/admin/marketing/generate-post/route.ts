// app/api/admin/marketing/generate-post/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { claudeGenerate } from '@/lib/claude'
import { buildInstagramPostPrompt, BPR_SYSTEM_CONTEXT } from '@/lib/marketing-prompts'
import { generateMarketingImage } from '@/lib/marketing-image'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      topic,
      service,
      language = 'en',
      tone = 'educational',
      generateImageFlag = true,
    } = body

    if (!topic && !service) {
      return NextResponse.json({ error: 'Topic or service is required' }, { status: 400 })
    }

    const topicToUse = topic || service

    // 1. Generate caption via Claude
    const prompt = buildInstagramPostPrompt({
      topic: topicToUse,
      service,
      language,
      tone,
    })

    const rawResponse = await claudeGenerate(
      [{ role: 'user', content: prompt }],
      { temperature: 0.8, maxTokens: 2048, systemPrompt: BPR_SYSTEM_CONTEXT }
    )

    // Parse JSON response from Claude
    let postData: {
      caption: string
      hashtags: string[]
      visual_suggestion: string
      image_prompt: string
      caption_pt?: string
    }

    try {
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON in response')
      postData = JSON.parse(jsonMatch[0])
    } catch {
      postData = {
        caption: rawResponse,
        hashtags: ['#physiotherapy', '#rehabilitation', '#BPR', '#Richmond', '#sportsinjury'],
        visual_suggestion: 'Professional clinic photo',
        image_prompt: `Professional physiotherapy clinic ${topicToUse}, modern medical setting, teal and navy colors`,
      }
    }

    // 2. Generate image via Gemini (if requested)
    let imageUrl: string | null = null
    if (generateImageFlag) {
      try {
        imageUrl = await generateMarketingImage({
          prompt: postData.image_prompt || postData.visual_suggestion,
          service,
        })
      } catch (imgError) {
        console.error('Image generation failed:', imgError)
      }
    }

    // 3. Save draft to DB
    const draft = await prisma.marketingPost.create({
      data: {
        caption: postData.caption,
        captionPt: postData.caption_pt || null,
        hashtags: postData.hashtags || [],
        imageUrl,
        status: 'DRAFT',
        platform: 'INSTAGRAM',
        topic: topicToUse,
        service: service || null,
        language,
        tone,
        generatedBy: 'CLAUDE',
        visualSuggestion: postData.visual_suggestion || null,
        createdById: (session.user as any).id,
      },
    }).catch((e: any) => { console.error('DB save failed:', e); return null })

    return NextResponse.json({
      success: true,
      post: {
        id: draft?.id,
        caption: postData.caption,
        caption_pt: postData.caption_pt,
        hashtags: postData.hashtags,
        visual_suggestion: postData.visual_suggestion,
        image_url: imageUrl,
        status: 'DRAFT',
      },
    })

  } catch (error) {
    console.error('Generate post error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    )
  }
}
