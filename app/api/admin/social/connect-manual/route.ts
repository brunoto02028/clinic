import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { getLongLivedToken } from '@/lib/instagram';

const IG_GRAPH_API_BASE = 'https://graph.instagram.com';
const GRAPH_API_VERSION = 'v21.0';

// POST /api/admin/social/connect-manual
// Connect Instagram account using a manually provided access token
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const user = session.user as any;
    const clinicId = user.clinicId;
    if (!clinicId) return NextResponse.json({ error: 'No clinic context' }, { status: 400 });

    const body = await req.json();
    const { accessToken: rawToken } = body;
    if (!rawToken) return NextResponse.json({ error: 'accessToken is required' }, { status: 400 });

    // Try to exchange for long-lived token (60 days)
    // If it's already long-lived, this will fail gracefully and we use raw token
    let accessToken = rawToken;
    let expiresIn = 5184000; // 60 days default

    try {
      const ll = await getLongLivedToken(rawToken);
      accessToken = ll.accessToken;
      expiresIn = ll.expiresIn;
      console.log('[MANUAL CONNECT] Exchanged for long-lived token, expires_in:', expiresIn);
    } catch (e: any) {
      console.log('[MANUAL CONNECT] Could not exchange token (may already be long-lived):', e?.message);
    }

    // Get Instagram user info
    const meRes = await fetch(
      `${IG_GRAPH_API_BASE}/${GRAPH_API_VERSION}/me?fields=user_id,username,name,profile_picture_url,followers_count,media_count&access_token=${accessToken}`
    );

    if (!meRes.ok) {
      const err = await meRes.text();
      console.error('[MANUAL CONNECT] /me failed:', err);
      return NextResponse.json({ error: `Failed to get Instagram user: ${err}` }, { status: 400 });
    }

    const meData = await meRes.json();
    console.log('[MANUAL CONNECT] Instagram user:', JSON.stringify({ id: meData.user_id || meData.id, username: meData.username }));

    const igAccountId = String(meData.user_id || meData.id);
    const igUsername = meData.username || '';
    const igProfilePic = meData.profile_picture_url || '';
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    await prisma.socialAccount.upsert({
      where: {
        clinicId_platform_accountId: {
          clinicId,
          platform: 'INSTAGRAM',
          accountId: igAccountId,
        },
      },
      update: {
        accessToken,
        tokenExpiresAt,
        accountName: igUsername,
        pageId: '',
        profilePicUrl: igProfilePic,
        isActive: true,
      },
      create: {
        clinicId,
        platform: 'INSTAGRAM',
        accountId: igAccountId,
        accountName: igUsername,
        accessToken,
        tokenExpiresAt,
        pageId: '',
        profilePicUrl: igProfilePic,
      },
    });

    return NextResponse.json({
      success: true,
      username: igUsername,
      accountId: igAccountId,
    });
  } catch (error: any) {
    console.error('[MANUAL CONNECT] error:', error?.message);
    return NextResponse.json({ error: error?.message || 'Failed to connect' }, { status: 500 });
  }
}
