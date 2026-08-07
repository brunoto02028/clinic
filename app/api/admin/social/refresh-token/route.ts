import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { refreshInstagramToken } from '@/lib/instagram';
import { resolveClinicId } from '@/lib/resolve-clinic-id';

export const dynamic = 'force-dynamic';

// POST /api/admin/social/refresh-token
// Refreshes an Instagram long-lived token (can be done every 60 days, must be done before expiry)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const clinicId = await resolveClinicId(session);
    if (!clinicId) return NextResponse.json({ error: 'No clinic context' }, { status: 400 });

    // Find active Instagram accounts for this clinic
    const accounts = await prisma.socialAccount.findMany({
      where: { clinicId, platform: 'INSTAGRAM', isActive: true },
    });

    if (accounts.length === 0) {
      return NextResponse.json({ error: 'No connected Instagram accounts' }, { status: 404 });
    }

    const results = await Promise.all(accounts.map((account) => refreshInstagramToken(account)));

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('[TOKEN REFRESH] error:', error?.message);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

// GET /api/admin/social/refresh-token
// Auto-refreshes tokens that expire in less than 10 days (called on page load)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const clinicId = await resolveClinicId(session);
    if (!clinicId) return NextResponse.json({ refreshed: 0 }, { status: 200 });

    // Find accounts expiring in less than 10 days
    const tenDaysFromNow = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const expiringAccounts = await prisma.socialAccount.findMany({
      where: {
        clinicId,
        platform: 'INSTAGRAM',
        isActive: true,
        tokenExpiresAt: { lte: tenDaysFromNow },
      },
    });

    if (expiringAccounts.length === 0) {
      return NextResponse.json({ refreshed: 0, message: 'No tokens need refresh' });
    }

    let refreshed = 0;
    for (const account of expiringAccounts) {
      const result = await refreshInstagramToken(account);
      if (result.success) refreshed++;
    }

    return NextResponse.json({ refreshed, message: `Auto-refreshed ${refreshed} token(s)` });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
