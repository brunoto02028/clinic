// Instagram Graph API integration
// Supports both Instagram Login API and Facebook Login API
// Docs: https://developers.facebook.com/docs/instagram-platform

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
const IG_GRAPH_API_BASE = `https://graph.instagram.com`;

// ─── Types ───

export interface InstagramAccountInfo {
  id: string;
  username: string;
  name: string;
  profilePictureUrl: string;
  followersCount: number;
  mediaCount: number;
}

export interface InstagramMediaInsights {
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  impressions: number;
}

export interface PublishResult {
  id: string;
  permalink?: string;
}

// ─── OAuth Helpers ───

function getBaseUrl(): string {
  return process.env.NEXTAUTH_URL || 'https://bpr.rehab';
}

// Detect which OAuth flow to use
// Instagram Login API (instagram.com OAuth) requires separate app config in Meta Console
// Disabled for now - using Facebook Login for Business instead
export function useInstagramLogin(): boolean {
  return false;
}

export function getInstagramAuthUrl(clinicId: string): string {
  const redirectUri = `${getBaseUrl()}/api/admin/social/callback`;
  const state = clinicId;

  // Prefer Instagram Login API (direct, no Facebook Pages needed)
  // client_id must be the Facebook App ID (not the internal Instagram App ID)
  if (useInstagramLogin()) {
    const appId = process.env.FACEBOOK_APP_ID;
    const scopes = [
      'instagram_business_basic',
      'instagram_business_content_publish',
      'instagram_business_manage_messages',
      'instagram_manage_comments',
    ].join(',');
    return `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}&response_type=code`;
  }

  // Fallback: Facebook Login for Business with config_id
  const appId = process.env.FACEBOOK_APP_ID;
  const configId = process.env.FACEBOOK_LOGIN_CONFIG_ID;
  if (configId) {
    return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&config_id=${configId}&state=${state}&response_type=code`;
  }

  // Fallback: regular Facebook Login with scope
  const scopes = [
    'instagram_basic',
    'instagram_content_publish',
    'instagram_manage_insights',
    'pages_show_list',
    'pages_read_engagement',
  ].join(',');
  return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}&response_type=code`;
}

export async function exchangeCodeForToken(code: string): Promise<{
  accessToken: string;
  expiresIn: number;
  userId?: string;
}> {
  const redirectUri = `${getBaseUrl()}/api/admin/social/callback`;

  // Instagram Login API token exchange
  if (useInstagramLogin()) {
    const igAppId = process.env.INSTAGRAM_APP_ID;
    const igAppSecret = process.env.INSTAGRAM_APP_SECRET;

    const formData = new URLSearchParams();
    formData.append('client_id', igAppId!);
    formData.append('client_secret', igAppSecret!);
    formData.append('grant_type', 'authorization_code');
    formData.append('redirect_uri', redirectUri);
    formData.append('code', code);

    const res = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[IG TOKEN] Instagram token exchange failed:', err);
      throw new Error(`Instagram token exchange failed: ${err}`);
    }

    const data = await res.json();
    console.log('[IG TOKEN] Instagram token exchange success, user_id:', data.user_id);
    return {
      accessToken: data.access_token,
      expiresIn: 3600, // Short-lived: 1 hour
      userId: String(data.user_id),
    };
  }

  // Facebook Login token exchange
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  const res = await fetch(
    `${GRAPH_API_BASE}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Token exchange failed: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in || 3600,
  };
}

export async function getLongLivedToken(shortLivedToken: string): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  // Instagram Login API long-lived token
  if (useInstagramLogin()) {
    const igAppSecret = process.env.INSTAGRAM_APP_SECRET;
    const res = await fetch(
      `${IG_GRAPH_API_BASE}/access_token?grant_type=ig_exchange_token&client_secret=${igAppSecret}&access_token=${shortLivedToken}`
    );
    if (!res.ok) {
      const err = await res.text();
      console.error('[IG TOKEN] Long-lived token failed:', err);
      throw new Error(`Failed to get IG long-lived token: ${err}`);
    }
    const data = await res.json();
    console.log('[IG TOKEN] Long-lived token success, expires_in:', data.expires_in);
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in || 5184000,
    };
  }

  // Facebook Login long-lived token
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const res = await fetch(
    `${GRAPH_API_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`
  );

  if (!res.ok) throw new Error('Failed to get long-lived token');
  const data = await res.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in || 5184000,
  };
}

// ─── Account Discovery ───

export async function getInstagramBusinessAccount(accessToken: string): Promise<{
  igAccountId: string;
  pageId: string;
  pageName: string;
  igUsername: string;
  igProfilePic: string;
}> {
  // ── Instagram Login API: get user directly from /me ──
  if (useInstagramLogin()) {
    console.log('[IG DISCOVERY] Using Instagram Login API...');
    const meRes = await fetch(
      `${IG_GRAPH_API_BASE}/${GRAPH_API_VERSION}/me?fields=user_id,username,name,account_type,profile_picture_url,followers_count,media_count&access_token=${accessToken}`
    );
    if (!meRes.ok) {
      const err = await meRes.text();
      console.error('[IG DISCOVERY] /me failed:', err);
      throw new Error(`Failed to get Instagram user: ${err}`);
    }
    const meData = await meRes.json();
    console.log('[IG DISCOVERY] Instagram user:', JSON.stringify({ id: meData.user_id, username: meData.username, type: meData.account_type }));

    return {
      igAccountId: String(meData.user_id || meData.id),
      pageId: '', // No Facebook Page needed with Instagram Login
      pageName: meData.name || meData.username || '',
      igUsername: meData.username || '',
      igProfilePic: meData.profile_picture_url || '',
    };
  }

  // ── Facebook Login API: get pages then find IG business account ──
  console.log('[IG DISCOVERY] Using Facebook Login API...');
  const pagesRes = await fetch(
    `${GRAPH_API_BASE}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${accessToken}`
  );
  if (!pagesRes.ok) {
    const err = await pagesRes.json().catch(() => ({}));
    throw new Error(`Failed to fetch Facebook Pages: ${JSON.stringify(err)}`);
  }
  const pagesData = await pagesRes.json();
  console.log('[IG DISCOVERY] Pages:', JSON.stringify(pagesData.data?.map((p: any) => ({ id: p.id, name: p.name, hasIg: !!p.instagram_business_account }))));

  const pageWithIg = pagesData.data?.find(
    (p: any) => p.instagram_business_account
  );

  if (!pageWithIg) {
    throw new Error(
      'No Instagram Business account found via Facebook Pages. Consider using Instagram Login API instead.'
    );
  }

  const igId = pageWithIg.instagram_business_account.id;
  const igRes = await fetch(
    `${GRAPH_API_BASE}/${igId}?fields=id,username,name,profile_picture_url,followers_count,media_count&access_token=${accessToken}`
  );
  if (!igRes.ok) throw new Error('Failed to fetch Instagram account details');
  const igData = await igRes.json();

  return {
    igAccountId: igData.id,
    pageId: pageWithIg.id,
    pageName: pageWithIg.name,
    igUsername: igData.username,
    igProfilePic: igData.profile_picture_url || '',
  };
}

// ─── Publishing ───

export async function publishPhoto(params: {
  igAccountId: string;
  accessToken: string;
  imageUrl: string;
  caption: string;
}): Promise<PublishResult> {
  const { igAccountId, accessToken, imageUrl, caption } = params;

  // Step 1: Create media container
  const containerRes = await fetch(
    `${GRAPH_API_BASE}/${igAccountId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: accessToken,
      }),
    }
  );

  if (!containerRes.ok) {
    const err = await containerRes.json();
    throw new Error(`Media container creation failed: ${JSON.stringify(err)}`);
  }

  const container = await containerRes.json();
  const containerId = container.id;

  // Step 2: Wait for container to be ready (poll status)
  await waitForMediaReady(containerId, accessToken);

  // Step 3: Publish the container
  const publishRes = await fetch(
    `${GRAPH_API_BASE}/${igAccountId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: accessToken,
      }),
    }
  );

  if (!publishRes.ok) {
    const err = await publishRes.json();
    throw new Error(`Publishing failed: ${JSON.stringify(err)}`);
  }

  const published = await publishRes.json();

  // Get permalink
  let permalink: string | undefined;
  try {
    const mediaRes = await fetch(
      `${GRAPH_API_BASE}/${published.id}?fields=permalink&access_token=${accessToken}`
    );
    if (mediaRes.ok) {
      const mediaData = await mediaRes.json();
      permalink = mediaData.permalink;
    }
  } catch {}

  return { id: published.id, permalink };
}

export async function publishCarousel(params: {
  igAccountId: string;
  accessToken: string;
  imageUrls: string[];
  caption: string;
}): Promise<PublishResult> {
  const { igAccountId, accessToken, imageUrls, caption } = params;

  // Step 1: Create individual media containers
  const childIds: string[] = [];
  for (const url of imageUrls) {
    const res = await fetch(
      `${GRAPH_API_BASE}/${igAccountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: url,
          is_carousel_item: true,
          access_token: accessToken,
        }),
      }
    );
    if (!res.ok) throw new Error('Failed to create carousel item');
    const data = await res.json();
    childIds.push(data.id);
  }

  // Wait for all children to be ready
  for (const id of childIds) {
    await waitForMediaReady(id, accessToken);
  }

  // Step 2: Create carousel container
  const containerRes = await fetch(
    `${GRAPH_API_BASE}/${igAccountId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'CAROUSEL',
        children: childIds,
        caption,
        access_token: accessToken,
      }),
    }
  );

  if (!containerRes.ok) throw new Error('Failed to create carousel container');
  const container = await containerRes.json();

  await waitForMediaReady(container.id, accessToken);

  // Step 3: Publish
  const publishRes = await fetch(
    `${GRAPH_API_BASE}/${igAccountId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: container.id,
        access_token: accessToken,
      }),
    }
  );

  if (!publishRes.ok) throw new Error('Failed to publish carousel');
  const published = await publishRes.json();
  return { id: published.id };
}

// ─── Reel Publishing ───

export async function publishReel(params: {
  igAccountId: string;
  accessToken: string;
  videoUrl: string;
  caption: string;
  coverUrl?: string;
  shareToFeed?: boolean;
}): Promise<PublishResult> {
  const { igAccountId, accessToken, videoUrl, caption, coverUrl, shareToFeed = true } = params;

  // Step 1: Create reel container
  const containerBody: any = {
    media_type: 'REELS',
    video_url: videoUrl,
    caption,
    share_to_feed: shareToFeed,
    access_token: accessToken,
  };
  if (coverUrl) containerBody.cover_url = coverUrl;

  const containerRes = await fetch(
    `${GRAPH_API_BASE}/${igAccountId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(containerBody),
    }
  );

  if (!containerRes.ok) {
    const err = await containerRes.json();
    throw new Error(`Reel container creation failed: ${JSON.stringify(err)}`);
  }

  const container = await containerRes.json();

  // Step 2: Wait for video processing (may take longer than photos)
  await waitForMediaReady(container.id, accessToken, 60, 3000);

  // Step 3: Publish
  const publishRes = await fetch(
    `${GRAPH_API_BASE}/${igAccountId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: container.id,
        access_token: accessToken,
      }),
    }
  );

  if (!publishRes.ok) {
    const err = await publishRes.json();
    throw new Error(`Reel publishing failed: ${JSON.stringify(err)}`);
  }

  const published = await publishRes.json();

  let permalink: string | undefined;
  try {
    const mediaRes = await fetch(
      `${GRAPH_API_BASE}/${published.id}?fields=permalink&access_token=${accessToken}`
    );
    if (mediaRes.ok) {
      const mediaData = await mediaRes.json();
      permalink = mediaData.permalink;
    }
  } catch {}

  return { id: published.id, permalink };
}

// ─── Stories Publishing ───

export async function publishStory(params: {
  igAccountId: string;
  accessToken: string;
  imageUrl: string;
}): Promise<PublishResult> {
  const { igAccountId, accessToken, imageUrl } = params;

  // Step 1: Create Stories media container
  const containerRes = await fetch(
    `${GRAPH_API_BASE}/${igAccountId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        media_type: 'STORIES',
        access_token: accessToken,
      }),
    }
  );

  if (!containerRes.ok) {
    const err = await containerRes.json();
    throw new Error(`Story container creation failed: ${JSON.stringify(err)}`);
  }

  const container = await containerRes.json();

  // Step 2: Wait for ready
  await waitForMediaReady(container.id, accessToken);

  // Step 3: Publish
  const publishRes = await fetch(
    `${GRAPH_API_BASE}/${igAccountId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: container.id,
        access_token: accessToken,
      }),
    }
  );

  if (!publishRes.ok) {
    const err = await publishRes.json();
    throw new Error(`Story publishing failed: ${JSON.stringify(err)}`);
  }

  const published = await publishRes.json();
  return { id: published.id };
}

// ─── Insights ───

export async function getMediaInsights(
  mediaId: string,
  accessToken: string
): Promise<InstagramMediaInsights> {
  const res = await fetch(
    `${GRAPH_API_BASE}/${mediaId}/insights?metric=likes,comments,shares,reach,impressions&access_token=${accessToken}`
  );

  const defaults: InstagramMediaInsights = {
    likes: 0,
    comments: 0,
    shares: 0,
    reach: 0,
    impressions: 0,
  };

  if (!res.ok) return defaults;

  const data = await res.json();
  const metrics = data.data || [];

  for (const m of metrics) {
    if (m.name in defaults) {
      (defaults as any)[m.name] = m.values?.[0]?.value || 0;
    }
  }

  return defaults;
}

// ─── Helpers ───

async function waitForMediaReady(
  containerId: string,
  accessToken: string,
  maxAttempts = 20,
  delayMs = 2000
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(
      `${GRAPH_API_BASE}/${containerId}?fields=status_code&access_token=${accessToken}`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.status_code === 'FINISHED') return;
      if (data.status_code === 'ERROR') {
        throw new Error(`Media processing failed: ${JSON.stringify(data)}`);
      }
    }
    await new Promise(r => setTimeout(r, delayMs));
  }
  throw new Error('Media processing timed out');
}
