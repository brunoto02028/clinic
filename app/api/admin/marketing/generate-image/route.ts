// app/api/admin/marketing/generate-image/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { generateMarketingImage } from '@/lib/marketing-image'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { prompt, service } = body

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Truncate prompt to avoid Gemini token/length failures
    const safePrompt = typeof prompt === 'string' ? prompt.slice(0, 500) : String(prompt).slice(0, 500)
    const imageUrl = await generateMarketingImage({ prompt: safePrompt, service })

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image generation failed. Try a different prompt.' },
        { status: 422 }
      )
    }

    return NextResponse.json({ success: true, image_url: imageUrl })

  } catch (error) {
    console.error('Generate image error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Image generation failed' },
      { status: 500 }
    )
  }
}
