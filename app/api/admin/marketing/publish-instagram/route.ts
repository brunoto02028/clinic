// app/api/admin/marketing/publish-instagram/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

const IG_USER_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || ''
const IG_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN || ''
const META_API_VERSION = 'v19.0'
const META_BASE = `https://graph.facebook.com/${META_API_VERSION}`

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { postId, caption, imageUrl, hashtags } = body

    if (!caption || !imageUrl) {
      return NextResponse.json(
        { error: 'Caption and imageUrl are required' },
        { status: 400 }
      )
    }

    if (!IG_USER_ID || !IG_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'Instagram credentials not configured. Add INSTAGRAM_BUSINESS_ACCOUNT_ID and INSTAGRAM_ACCESS_TOKEN to .env' },
        { status: 500 }
      )
    }

    const fullCaption = hashtags?.length
      ? `${caption}\n\n${hashtags.join(' ')}`
      : caption

    // STEP 1: Create media container
    const containerRes = await fetch(
      `${META_BASE}/${IG_USER_ID}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          caption: fullCaption,
          access_token: IG_ACCESS_TOKEN,
        }),
      }
    )

    const containerData = await containerRes.json()
    if (!containerRes.ok || containerData.error) {
      throw new Error(`Container creation failed: ${containerData.error?.message || containerRes.statusText}`)
    }

    const containerId = containerData.id

    // STEP 2: Check container status
    let containerReady = false
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 2000))
      const statusRes = await fetch(
        `${META_BASE}/${containerId}?fields=status_code&access_token=${IG_ACCESS_TOKEN}`
      )
      const statusData = await statusRes.json()
      if (statusData.status_code === 'FINISHED') {
        containerReady = true
        break
      }
      if (statusData.status_code === 'ERROR') {
        throw new Error('Media container processing failed')
      }
    }

    if (!containerReady) {
      throw new Error('Media container timed out — try again in a few minutes')
    }

    // STEP 3: Publish
    const publishRes = await fetch(
      `${META_BASE}/${IG_USER_ID}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: IG_ACCESS_TOKEN,
        }),
      }
    )

    const publishData = await publishRes.json()
    if (!publishRes.ok || publishData.error) {
      throw new Error(`Publish failed: ${publishData.error?.message || publishRes.statusText}`)
    }

    const igPostId = publishData.id

    // STEP 4: Update DB
    if (postId) {
      await prisma.marketingPost.update({
        where: { id: postId },
        data: {
          status: 'PUBLISHED',
          instagramPostId: igPostId,
          publishedAt: new Date(),
        },
      }).catch(() => null)
    }

    return NextResponse.json({
      success: true,
      instagram_post_id: igPostId,
      message: 'Post published successfully to Instagram',
    })

  } catch (error) {
    console.error('Publish Instagram error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Publish failed' },
      { status: 500 }
    )
  }
}
