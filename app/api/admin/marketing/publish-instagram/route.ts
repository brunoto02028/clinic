// app/api/admin/marketing/publish-instagram/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

const META_API_VERSION = 'v21.0'
const META_BASE = `https://graph.instagram.com/${META_API_VERSION}`

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { postId, caption, imageUrl, hashtags, publishToFacebook = true, publishToStories = false } = body

    if (!caption || !imageUrl) {
      return NextResponse.json(
        { error: 'Caption and imageUrl are required' },
        { status: 400 }
      )
    }

    // Get token from DB
    const user = session.user as any
    const clinicId = user.clinicId
    const igAccount = await prisma.socialAccount.findFirst({
      where: { clinicId, platform: 'INSTAGRAM', isActive: true },
    })
    if (!igAccount) {
      return NextResponse.json({ error: 'No connected Instagram account. Go to Instagram Connect first.' }, { status: 400 })
    }
    const IG_USER_ID = igAccount.accountId
    const IG_ACCESS_TOKEN = igAccount.accessToken

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

    // STEP 5: Optionally publish to Facebook Page too
    let fbPostId: string | null = null
    let fbError: string | null = null
    if (publishToFacebook) {
      try {
        // Get Facebook Page access token from DB (stored during OAuth)
        const fbAccount = await prisma.socialAccount.findFirst({
          where: { clinicId, platform: 'FACEBOOK', isActive: true },
        })
        const fbPageId = fbAccount?.accountId || igAccount?.metadata && (igAccount.metadata as any)?.pageId
        const fbToken = fbAccount?.accessToken || igAccount?.accessToken

        if (fbPageId && fbToken) {
          // Post photo to Facebook Page
          const fbRes = await fetch(
            `https://graph.facebook.com/v21.0/${fbPageId}/photos`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                url: imageUrl,
                caption: fullCaption,
                access_token: fbToken,
              }),
            }
          )
          const fbData = await fbRes.json()
          if (fbData.id) fbPostId = fbData.id
          else fbError = fbData.error?.message || 'Facebook publish failed'
        } else {
          fbError = 'No Facebook Page connected. Connect via Instagram Connect page.'
        }
      } catch (e: any) {
        fbError = e?.message || 'Facebook publish error'
        console.error('[PUBLISH] Facebook error:', fbError)
      }
    }

    // STEP 6: Optionally publish to Stories
    let storyId: string | null = null
    let storyError: string | null = null
    if (publishToStories) {
      try {
        const storyContainerRes = await fetch(
          `${META_BASE}/${IG_USER_ID}/media`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image_url: imageUrl,
              media_type: 'STORIES',
              access_token: IG_ACCESS_TOKEN,
            }),
          }
        )
        const storyContainerData = await storyContainerRes.json()
        if (storyContainerData.id) {
          // Wait for story container
          for (let i = 0; i < 10; i++) {
            await new Promise(r => setTimeout(r, 2000))
            const st = await fetch(`${META_BASE}/${storyContainerData.id}?fields=status_code&access_token=${IG_ACCESS_TOKEN}`)
            const stData = await st.json()
            if (stData.status_code === 'FINISHED') break
            if (stData.status_code === 'ERROR') throw new Error('Story container failed')
          }
          const storyPublishRes = await fetch(
            `${META_BASE}/${IG_USER_ID}/media_publish`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ creation_id: storyContainerData.id, access_token: IG_ACCESS_TOKEN }),
            }
          )
          const storyPublishData = await storyPublishRes.json()
          if (storyPublishData.id) storyId = storyPublishData.id
          else storyError = storyPublishData.error?.message || 'Story publish failed'
        }
      } catch (e: any) {
        storyError = e?.message || 'Story publish error'
        console.error('[PUBLISH] Story error:', storyError)
      }
    }

    return NextResponse.json({
      success: true,
      instagram_post_id: igPostId,
      facebook_post_id: fbPostId,
      facebook_error: fbError,
      story_id: storyId,
      story_error: storyError,
      message: fbPostId
        ? 'Published to Instagram and Facebook'
        : fbError
          ? `Published to Instagram. Facebook: ${fbError}`
          : 'Post published successfully to Instagram',
    })

  } catch (error) {
    console.error('Publish Instagram error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Publish failed' },
      { status: 500 }
    )
  }
}
