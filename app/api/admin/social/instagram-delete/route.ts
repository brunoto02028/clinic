import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const mediaId = searchParams.get('mediaId')
    if (!mediaId) return NextResponse.json({ error: 'mediaId required' }, { status: 400 })

    // Get Instagram account credentials
    const account = await prisma.socialAccount.findFirst({
      where: { platform: 'INSTAGRAM' },
    })

    if (!account?.accessToken) {
      return NextResponse.json({ error: 'Instagram account not connected' }, { status: 400 })
    }

    // Delete via Instagram Graph API
    const res = await fetch(
      `https://graph.instagram.com/v21.0/${mediaId}?access_token=${account.accessToken}`,
      { method: 'DELETE' }
    )

    const data = await res.json()

    if (!res.ok || data.error) {
      console.error('[instagram-delete]', data)
      // Instagram Basic Display API doesn't support delete — only Instagram Graph API for Business
      // Return a helpful message
      return NextResponse.json(
        { error: data.error?.message || 'Instagram does not allow deleting posts via API for this account type. Please delete directly on Instagram.' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, deleted: mediaId })

  } catch (error: any) {
    console.error('[instagram-delete]', error?.message)
    return NextResponse.json({ error: error?.message || 'Delete failed' }, { status: 500 })
  }
}
