// Instagram Graph API integration via Facebook Graph API
// Docs: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

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

export function getInstagramAuthUrl(clinicId: string): string {
  const appId = process.env.FACEBOOK_APP_ID;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/admin/social/callback`;
  const state = clinicId; // Pass clinicId through OAuth state

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
}> {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/admin/social/callback`;

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
    expiresIn: data.expires_in || 5184000, // Default 60 days
  };
}

export async function getLongLivedToken(shortToken: string): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  const res = await fetch(
    `${GRAPH_API_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`
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
  // Step 1: Get user's Facebook Pages
  const pagesRes = await fetch(
    `${GRAPH_API_BASE}/me/accounts?fields=id,name,instagram_business_account&access_token=${accessToken}`
  );
  if (!pagesRes.ok) throw new Error('Failed to fetch Facebook Pages');
  const pagesData = await pagesRes.json();

  const pageWithIg = pagesData.data?.find(
    (p: any) => p.instagram_business_account
  );
  if (!pageWithIg) {
    throw new Error(
      'No Instagram Business account found. Make sure your Instagram account is connected to a Facebook Page and set as a Business or Creator account.'
    );
  }

  const igId = pageWithIg.instagram_business_account.id;

  // Step 2: Get Instagram account details
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
