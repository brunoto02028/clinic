// app/api/admin/marketing/instagram-status/route.ts
// Returns which env vars are configured (without exposing their values)
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { getConfigValue } from '@/lib/system-config'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [fbAppId, fbAppSecret, configId, accessToken, businessId] = await Promise.all([
      getConfigValue('FACEBOOK_APP_ID'),
      getConfigValue('FACEBOOK_APP_SECRET'),
      getConfigValue('FACEBOOK_LOGIN_CONFIG_ID'),
      getConfigValue('INSTAGRAM_ACCESS_TOKEN'),
      getConfigValue('INSTAGRAM_BUSINESS_ACCOUNT_ID'),
    ])

    return NextResponse.json({
      hasFbAppId: !!fbAppId,
      hasFbAppSecret: !!fbAppSecret,
      hasConfigId: !!configId,
      hasAccessToken: !!accessToken,
      hasBusinessId: !!businessId,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
