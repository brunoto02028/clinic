import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { exchangeCodeForToken, getLongLivedToken, getInstagramBusinessAccount } from '@/lib/instagram';

export const dynamic = 'force-dynamic';

function getSiteUrl(): string {
  return process.env.NEXTAUTH_URL || 'https://bpr.rehab';
}

// GET /api/admin/social/callback - Facebook OAuth callback
export async function GET(req: NextRequest) {
  const baseUrl = getSiteUrl();

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // clinicId
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(`${baseUrl}/admin/marketing/instagram-connect?error=oauth_denied`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${baseUrl}/admin/marketing/instagram-connect?error=missing_params`);
    }

    const clinicId = state;

    // Step 1: Exchange code for short-lived token
    const { accessToken: shortToken } = await exchangeCodeForToken(code);

    // Step 2: Exchange for long-lived token (60 days)
    const { accessToken, expiresIn } = await getLongLivedToken(shortToken);

    // Step 3: Get Instagram Business Account info
    const igInfo = await getInstagramBusinessAccount(accessToken);

    // Step 4: Save or update the social account
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    await prisma.socialAccount.upsert({
      where: {
        clinicId_platform_accountId: {
          clinicId,
          platform: 'INSTAGRAM',
          accountId: igInfo.igAccountId,
        },
      },
      update: {
        accessToken,
        tokenExpiresAt,
        accountName: igInfo.igUsername,
        pageId: igInfo.pageId,
        profilePicUrl: igInfo.igProfilePic,
        isActive: true,
      },
      create: {
        clinicId,
        platform: 'INSTAGRAM',
        accountId: igInfo.igAccountId,
        accountName: igInfo.igUsername,
        accessToken,
        tokenExpiresAt,
        pageId: igInfo.pageId,
        profilePicUrl: igInfo.igProfilePic,
      },
    });

    // Step 5: Save the linked Facebook Page as its own connected account —
    // this is what makes "also post to Facebook" actually work (see
    // lib/instagram.ts publishToFacebookPage). Only present when connected
    // via Facebook Login for Business; the Instagram Login API path has no
    // Page/pageAccessToken and cross-posting isn't possible there.
    if (igInfo.pageId && igInfo.pageAccessToken) {
      await prisma.socialAccount.upsert({
        where: {
          clinicId_platform_accountId: {
            clinicId,
            platform: 'FACEBOOK',
            accountId: igInfo.pageId,
          },
        },
        update: {
          accessToken: igInfo.pageAccessToken,
          tokenExpiresAt,
          accountName: igInfo.pageName,
          isActive: true,
        },
        create: {
          clinicId,
          platform: 'FACEBOOK',
          accountId: igInfo.pageId,
          accountName: igInfo.pageName,
          accessToken: igInfo.pageAccessToken,
          tokenExpiresAt,
        },
      });
    }

    return NextResponse.redirect(
      `${baseUrl}/admin/marketing/instagram-connect?success=connected&account=${igInfo.igUsername}`
    );
  } catch (error: any) {
    console.error('[SOCIAL CALLBACK] error:', error?.message);
    return NextResponse.redirect(
      `${baseUrl}/admin/marketing/instagram-connect?error=${encodeURIComponent(error?.message || 'connection_failed')}`
    );
  }
}
