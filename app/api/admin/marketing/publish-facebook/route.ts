import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { publishToFacebookPage } from '@/lib/instagram'
import { resolveClinicId } from '@/lib/resolve-clinic-id'

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { imageUrl, caption } = await req.json()
    if (!imageUrl) return NextResponse.json({ error: 'imageUrl required' }, { status: 400 })

    const clinicId = await resolveClinicId(session)
    if (!clinicId) return NextResponse.json({ error: 'No clinic context' }, { status: 400 })

    // Reuses the shared, tested Facebook Page publish helper (the account's
    // real pageId/accessToken columns on SocialAccount) — the previous
    // version of this route fell back to a `metadata` JSON field that
    // doesn't exist on the model, so that fallback path always failed
    // silently with "Facebook Page not connected".
    const result = await publishToFacebookPage({ clinicId, imageUrl, caption: caption || '' })
    if (!result) {
      return NextResponse.json(
        { error: 'Facebook Page not connected. Go to Instagram Connect to link your Facebook Page.' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, post_id: result.id, platform: 'FACEBOOK' })
  } catch (error: any) {
    console.error('[publish-facebook]', error?.message)
    return NextResponse.json({ error: error?.message || 'Facebook publish failed' }, { status: 500 })
  }
}
