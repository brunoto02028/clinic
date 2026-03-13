import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { imageUrl, caption } = await req.json()
    if (!imageUrl) return NextResponse.json({ error: 'imageUrl required' }, { status: 400 })

    // Fetch Facebook account credentials
    const fbAccount = await prisma.socialAccount.findFirst({
      where: { platform: 'FACEBOOK' },
    })

    // Fallback: try Instagram account metadata for Facebook page info
    const igAccount = !fbAccount ? await prisma.socialAccount.findFirst({
      where: { platform: 'INSTAGRAM' },
    }) : null

    const pageId = fbAccount?.accountId || (igAccount?.metadata as any)?.pageId
    const accessToken = fbAccount?.accessToken || (igAccount?.metadata as any)?.pageAccessToken

    if (!pageId || !accessToken) {
      return NextResponse.json(
        { error: 'Facebook Page not connected. Go to Instagram Connect to link your Facebook Page.' },
        { status: 400 }
      )
    }

    // Post photo to Facebook Page
    const fbRes = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}/photos`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: imageUrl,
          caption: caption || '',
          access_token: accessToken,
        }),
      }
    )

    const fbData = await fbRes.json()

    if (!fbRes.ok || fbData.error) {
      console.error('[publish-facebook]', fbData)
      return NextResponse.json(
        { error: fbData.error?.message || 'Facebook publish failed' },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      post_id: fbData.id || fbData.post_id,
      platform: 'FACEBOOK',
    })

  } catch (error: any) {
    console.error('[publish-facebook]', error?.message)
    return NextResponse.json({ error: error?.message || 'Facebook publish failed' }, { status: 500 })
  }
}
