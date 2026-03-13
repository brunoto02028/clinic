import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

const IG_BASE = 'https://graph.instagram.com/v21.0';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const user = session.user as any;
    const clinicId = user.clinicId;

    const account = await prisma.socialAccount.findFirst({
      where: { clinicId, platform: 'INSTAGRAM', isActive: true },
    });

    if (!account) {
      return NextResponse.json({ error: 'No connected Instagram account' }, { status: 404 });
    }

    const token = account.accessToken;
    const igId = account.accountId;

    // Fetch profile + basic stats
    const profileRes = await fetch(
      `${IG_BASE}/${igId}?fields=user_id,username,name,biography,website,profile_picture_url,followers_count,media_count&access_token=${token}`
    );
    if (!profileRes.ok) {
      const err = await profileRes.text();
      return NextResponse.json({ error: `Failed to fetch profile: ${err}` }, { status: 400 });
    }
    const profile = await profileRes.json();

    // Fetch recent media (last 12 posts)
    const mediaRes = await fetch(
      `${IG_BASE}/${igId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=12&access_token=${token}`
    );
    let media = [];
    if (mediaRes.ok) {
      const mediaData = await mediaRes.json();
      media = mediaData.data || [];
    }

    // Token expiry info
    const tokenExpiresAt = account.tokenExpiresAt;
    const daysLeft = tokenExpiresAt
      ? Math.max(0, Math.floor((new Date(tokenExpiresAt).getTime() - Date.now()) / 86400000))
      : null;

    // Posts published via our system
    const publishedPosts = await prisma.socialPost.count({
      where: { clinicId, status: 'PUBLISHED' },
    });

    return NextResponse.json({
      profile,
      media,
      accountId: igId,
      accountName: account.accountName,
      tokenExpiresAt,
      daysLeft,
      publishedPosts,
    });
  } catch (error: any) {
    console.error('[IG OVERVIEW]', error?.message);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
