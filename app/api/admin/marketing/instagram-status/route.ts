// app/api/admin/marketing/instagram-status/route.ts
// Returns which env vars are configured (without exposing their values)
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
      hasFbAppId: !!process.env.FACEBOOK_APP_ID,
      hasFbAppSecret: !!process.env.FACEBOOK_APP_SECRET,
      hasAccessToken: !!process.env.INSTAGRAM_ACCESS_TOKEN,
      hasBusinessId: !!process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
