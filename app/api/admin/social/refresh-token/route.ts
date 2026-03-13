import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

const IG_GRAPH_API_BASE = 'https://graph.instagram.com';

// POST /api/admin/social/refresh-token
// Refreshes an Instagram long-lived token (can be done every 60 days, must be done before expiry)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const user = session.user as any;
    const clinicId = user.clinicId;
    if (!clinicId) return NextResponse.json({ error: 'No clinic context' }, { status: 400 });

    // Find active Instagram accounts for this clinic
    const accounts = await prisma.socialAccount.findMany({
      where: { clinicId, platform: 'INSTAGRAM', isActive: true },
    });

    if (accounts.length === 0) {
      return NextResponse.json({ error: 'No connected Instagram accounts' }, { status: 404 });
    }

    const results = [];

    for (const account of accounts) {
      try {
        const igAppSecret = process.env.INSTAGRAM_APP_SECRET;
        const res = await fetch(
          `${IG_GRAPH_API_BASE}/refresh_access_token?grant_type=ig_refresh_token&access_token=${account.accessToken}`
        );

        if (!res.ok) {
          const err = await res.text();
          console.error(`[TOKEN REFRESH] Failed for ${account.accountName}:`, err);
          results.push({ accountName: account.accountName, success: false, error: err });
          continue;
        }

        const data = await res.json();
        const newToken = data.access_token;
        const expiresIn = data.expires_in || 5184000;
        const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

        await prisma.socialAccount.update({
          where: { id: account.id },
          data: { accessToken: newToken, tokenExpiresAt },
        });

        console.log(`[TOKEN REFRESH] Refreshed token for ${account.accountName}, new expiry: ${tokenExpiresAt.toISOString()}`);
        results.push({
          accountName: account.accountName,
          success: true,
          expiresAt: tokenExpiresAt.toISOString(),
          daysLeft: Math.floor(expiresIn / 86400),
        });
      } catch (e: any) {
        results.push({ accountName: account.accountName, success: false, error: e?.message });
      }
    }

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

    const user = session.user as any;
    const clinicId = user.clinicId;
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
      try {
        const res = await fetch(
          `${IG_GRAPH_API_BASE}/refresh_access_token?grant_type=ig_refresh_token&access_token=${account.accessToken}`
        );
        if (res.ok) {
          const data = await res.json();
          const expiresIn = data.expires_in || 5184000;
          await prisma.socialAccount.update({
            where: { id: account.id },
            data: {
              accessToken: data.access_token,
              tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
            },
          });
          refreshed++;
          console.log(`[TOKEN AUTO-REFRESH] Refreshed ${account.accountName}`);
        }
      } catch {}
    }

    return NextResponse.json({ refreshed, message: `Auto-refreshed ${refreshed} token(s)` });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
