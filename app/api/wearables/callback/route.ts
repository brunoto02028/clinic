export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyWearableState } from '@/lib/wearable-state';

const BASE_URL = process.env.NEXTAUTH_URL || 'https://bpr.clinic';
/** Where the app asked to be sent back to — the scheme in mobile/app.json. */
const APP_RETURN = 'bprclinic://wearables';

function back(source: 'web' | 'app', query: string) {
  return NextResponse.redirect(
    source === 'app' ? `${APP_RETURN}?${query}` : `${BASE_URL}/dashboard/devices?${query}`
  );
}

/**
 * Where the provider sends the patient back.
 *
 * This route is unauthenticated by nature — the provider calls it, not the
 * patient's session — and it used to take `userId` from the query string and
 * write a WearableConnection for it. Anyone could mark any patient as
 * connected to any device by visiting a URL. The subject now comes from a
 * signed, expiring state that only this server can mint.
 */
export async function GET(request: NextRequest) {
  const error = request.nextUrl.searchParams.get('error');
  const claim = verifyWearableState(request.nextUrl.searchParams.get('state'));
  // The provider comes from the signed state, never from the query: the query
  // was what decided which device got marked as connected, and the state did
  // not bind it.
  const provider = claim?.provider || '';

  if (!claim) {
    // No valid state: nothing is written, and the patient is told rather than
    // silently returned to a page that claims success.
    return back('web', 'connected=0&error=invalid_state');
  }

  if (error) {
    return back(claim.source, `connected=0&error=${encodeURIComponent(error)}`);
  }

  await (prisma as any).wearableConnection.upsert({
    where: { userId_provider: { userId: claim.userId, provider: provider.toUpperCase() } },
    create: {
      userId: claim.userId,
      provider: provider.toUpperCase(),
      status: 'CONNECTED',
      lastSyncedAt: new Date(),
    },
    update: {
      status: 'CONNECTED',
      lastSyncedAt: new Date(),
    },
  });

  return back(claim.source, `connected=1&provider=${encodeURIComponent(provider)}`);
}
