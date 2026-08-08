import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { getInstagramAuthUrl } from '@/lib/instagram';
import { resolveClinicId } from '@/lib/resolve-clinic-id';
import { getConfigValue } from '@/lib/system-config';

export const dynamic = 'force-dynamic';

// GET /api/admin/social/accounts - List connected accounts
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const clinicId = await resolveClinicId(session);

    const accounts = await prisma.socialAccount.findMany({
      where: clinicId ? { clinicId } : {},
      include: { _count: { select: { posts: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ accounts });
  } catch (error: any) {
    console.error('[SOCIAL ACCOUNTS] GET error:', error?.message);
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}

// POST /api/admin/social/accounts/connect - Get OAuth URL
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const clinicId = await resolveClinicId(session);
    if (!clinicId) return NextResponse.json({ error: 'No clinic context' }, { status: 400 });

    const body = await req.json();
    const { platform } = body;

    if (platform === 'INSTAGRAM') {
      const [fbAppId, fbAppSecret] = await Promise.all([
        getConfigValue('FACEBOOK_APP_ID'),
        getConfigValue('FACEBOOK_APP_SECRET'),
      ]);
      if (!fbAppId || !fbAppSecret) {
        return NextResponse.json({
          error: 'Facebook App not configured. Set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in Admin → AI Settings.',
        }, { status: 500 });
      }
      const authUrl = await getInstagramAuthUrl(clinicId);
      return NextResponse.json({ authUrl });
    }

    return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 });
  } catch (error: any) {
    console.error('[SOCIAL ACCOUNTS] POST error:', error?.message);
    return NextResponse.json({ error: 'Failed to initiate connection' }, { status: 500 });
  }
}
