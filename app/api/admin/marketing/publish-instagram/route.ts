// app/api/admin/marketing/publish-instagram/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'
import { publishPhoto, publishStory, publishToFacebookPage } from '@/lib/instagram'
import { resolveClinicId } from '@/lib/resolve-clinic-id'

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { postId, caption, imageUrl, storyImageUrl, hashtags, publishToFacebook = true, publishToStories = false } = body

    if (!caption || !imageUrl) {
      return NextResponse.json({ error: 'Caption and imageUrl are required' }, { status: 400 })
    }

    const clinicId = await resolveClinicId(session)
    const igAccount = clinicId
      ? await prisma.socialAccount.findFirst({ where: { clinicId, platform: 'INSTAGRAM', isActive: true } })
      : null
    if (!igAccount) {
      return NextResponse.json({ error: 'No connected Instagram account. Go to Instagram Connect first.' }, { status: 400 })
    }

    const fullCaption = hashtags?.length ? `${caption}\n\n${hashtags.join(' ')}` : caption

    // Publish the feed post via the shared, tested Graph API layer (graph.facebook.com —
    // matches how accounts are actually connected here, Facebook Login for Business).
    // The previous version of this route reimplemented publishing from scratch against
    // graph.instagram.com, which is only valid for the (unused) Instagram Login API flow
    // and would fail for every account this app actually connects.
    let igPostId: string;
    try {
      const result = await publishPhoto({
        igAccountId: igAccount.accountId,
        accessToken: igAccount.accessToken,
        imageUrl,
        caption: fullCaption,
      });
      igPostId = result.id;
    } catch (e: any) {
      return NextResponse.json({ error: `Instagram publish failed: ${e.message}` }, { status: 502 })
    }

    // Legacy: mark a MarketingPost draft as published, if this call came from
    // that flow (Marketing dashboard "Quick Generate"). Optional/best-effort.
    if (postId) {
      await prisma.marketingPost.update({
        where: { id: postId },
        data: { status: 'PUBLISHED', instagramPostId: igPostId, publishedAt: new Date() },
      }).catch(() => null)
    }

    // Optionally cross-post to the connected Facebook Page.
    let fbPostId: string | null = null
    let fbError: string | null = null
    if (publishToFacebook) {
      try {
        const fbResult = await publishToFacebookPage({ clinicId: clinicId!, imageUrl, caption: fullCaption })
        if (fbResult) fbPostId = fbResult.id
        else fbError = 'No Facebook Page connected. Reconnect via Instagram Connect using the "Conectar Instagram" OAuth button (not the manual token).'
      } catch (e: any) {
        fbError = e?.message || 'Facebook publish error'
        console.error('[PUBLISH] Facebook error:', fbError)
      }
    }

    // Optionally also publish a Story version.
    let storyId: string | null = null
    let storyError: string | null = null
    if (publishToStories) {
      try {
        const storyResult = await publishStory({
          igAccountId: igAccount.accountId,
          accessToken: igAccount.accessToken,
          imageUrl: storyImageUrl || imageUrl,
        });
        storyId = storyResult.id
      } catch (e: any) {
        storyError = e?.message || 'Story publish error'
        console.error('[PUBLISH] Story error:', storyError)
      }
    }

    // Unified history record — feeds the same Marketing -> Calendar view as
    // every other publish path (article publisher, content calendar). The
    // old version of this route only ever touched MarketingPost, so Studio
    // posts never showed up alongside those.
    await prisma.socialPost.create({
      data: {
        clinicId: clinicId!,
        accountId: igAccount.id,
        caption: fullCaption,
        postType: 'IMAGE',
        mediaUrls: [imageUrl],
        mediaPaths: [],
        status: 'PUBLISHED',
        publishedAt: new Date(),
        platformPostId: igPostId,
        publishError: [fbError && `Facebook: ${fbError}`, storyError && `Story: ${storyError}`].filter(Boolean).join('; ') || null,
        aiGenerated: true,
        createdById: (session.user as any).id,
      },
    }).catch((err) => console.error('[publish-instagram] Failed to save SocialPost record:', err));

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
