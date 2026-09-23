export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getEffectiveUser } from '@/lib/get-effective-user';
import { OW_PROVIDERS, owCreateUser, owGetAuthUrl } from '@/lib/open-wearables';
import { signWearableState } from '@/lib/wearable-state';
import { withingsAuthorizeUrl, withingsConfigured, WITHINGS_SCOPE } from '@/lib/withings';

const BASE_URL = process.env.NEXTAUTH_URL || 'https://bpr.clinic';

/**
 * Starts the provider's OAuth flow.
 *
 * Two things were wrong here. It authenticated with `getServerSession` only,
 * so the app — which opened this URL in the phone's browser, where there is no
 * cookie — was bounced to the web login and could never connect a device;
 * `getEffectiveUser` accepts the mobile bearer as well. And the callback's
 * redirect URI carried a bare `userId`, which the callback then trusted: the
 * flow now hands the provider a signed, expiring state instead.
 *
 * `?format=json` returns the provider's authorisation URL rather than
 * redirecting to it, because the app cannot attach an Authorization header to
 * a URL it merely opens: it asks for the URL with its token, then opens that.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const effectiveUser = await getEffectiveUser();
  if (!effectiveUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { provider } = await params;
  const userId = effectiveUser.userId;
  const asJson = request.nextUrl.searchParams.get('format') === 'json';

  // Anything could be put in the path and it was passed through to the
  // aggregator and, later, stored as a connection's provider.
  if (!OW_PROVIDERS.some((p) => p.key === provider.toLowerCase())) {
    return asJson
      ? NextResponse.json({ error: 'Unknown provider' }, { status: 400 })
      : NextResponse.redirect(`${BASE_URL}/dashboard/devices?connected=0&error=unknown_provider`);
  }

  const isDirect = provider.toLowerCase() === 'withings';

  // Each path has its own credentials, and neither can be started without
  // them. Saying which is missing beats a button that does nothing.
  if (isDirect ? !withingsConfigured() : !process.env.OPEN_WEARABLES_API_KEY) {
    const message = 'Device connections are not configured for this clinic yet.';
    return asJson
      ? NextResponse.json({ error: message }, { status: 503 })
      : NextResponse.redirect(`${BASE_URL}/dashboard/devices?connected=0&error=unavailable`);
  }

  try {
    let connection = await (prisma as any).wearableConnection.findFirst({
      where: { userId, provider: provider.toUpperCase() },
    });

    if (!connection) {
      connection = await (prisma as any).wearableConnection.create({
        data: {
          userId,
          provider: provider.toUpperCase(),
          status: 'DISCONNECTED',
          scopes: isDirect ? WITHINGS_SCOPE : null,
        },
      });
    }

    let owUserId = connection?.owUserId;

    if (!isDirect && !owUserId) {
      const me = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      const owUser = await owCreateUser(me?.email || `${userId}@bpr.clinic`, userId);
      owUserId = owUser.id;

      if (connection) {
        await (prisma as any).wearableConnection.update({
          where: { id: connection.id },
          data: { owUserId },
        });
      }
    }

    const state = signWearableState(userId, asJson ? 'app' : 'web', provider);
    // Withings signs the redirect URI into the authorisation request and
    // checks it again at the token exchange, so it must not carry the state —
    // that travels in `state`, which they echo back untouched.
    const redirectUri = isDirect
      ? `${BASE_URL}/api/wearables/callback`
      : `${BASE_URL}/api/wearables/callback?provider=${provider}&state=${encodeURIComponent(state)}`;

    const authorization_url = isDirect
      ? withingsAuthorizeUrl(state, redirectUri)
      : (await owGetAuthUrl(provider, owUserId, redirectUri)).authorization_url;

    return asJson
      ? NextResponse.json({ url: authorization_url })
      : NextResponse.redirect(authorization_url);
  } catch (err: any) {
    // The aggregator is a third party and its credentials are environment
    // configuration: without them every call throws here. Saying so beats the
    // silent "nothing happened" the screen showed before.
    console.error('[wearables/connect] error:', err?.message);
    const message = process.env.OPEN_WEARABLES_API_KEY
      ? 'Could not start the connection. Please try again.'
      : 'Device connections are not configured for this clinic yet.';
    return asJson
      ? NextResponse.json({ error: message }, { status: 503 })
      : NextResponse.redirect(`${BASE_URL}/dashboard/devices?connected=0&error=unavailable`);
  }
}
