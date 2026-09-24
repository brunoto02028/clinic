export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { owDisconnect } from '@/lib/open-wearables';
import { getEffectiveUser } from '@/lib/get-effective-user';
import {
  withingsAccessToken,
  withingsRevokeSubscription,
  withingsCallbackUrl,
  WITHINGS_APPLI,
} from '@/lib/withings';

export async function POST(request: NextRequest) {
  const eff = await getEffectiveUser();
  if (!eff) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { provider } = await request.json();
  const userId = eff.userId;

  const connection = await (prisma as any).wearableConnection.findFirst({
    where: { userId, provider: provider.toUpperCase() },
  });

  if (!connection) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (connection.owUserId) {
    try {
      await owDisconnect(connection.owUserId, provider.toLowerCase());
    } catch {}
  }

  // Cancel the notifications this connection subscribed to (T-9). Without
  // this, disconnecting stops nothing: Withings would go on calling us about a
  // patient who asked us to stop, and the webhook would go on writing to their
  // record. Revoking the token itself, and deleting it from the database, is
  // T-10 — this is only the half that T-9 created.
  if (provider.toUpperCase() === 'WITHINGS' && connection.accessToken) {
    try {
      const token = await withingsAccessToken(connection);
      const callbackUrl = withingsCallbackUrl();
      await Promise.all(
        [WITHINGS_APPLI.BLOOD_PRESSURE, WITHINGS_APPLI.WEIGHT, WITHINGS_APPLI.ACTIVITY, WITHINGS_APPLI.SLEEP].map((appli) =>
          withingsRevokeSubscription(token, callbackUrl, appli).catch((err) =>
            console.error(`[wearables/disconnect] notify revoke appli=${appli}:`, err?.message)
          )
        )
      );
    } catch (e: any) {
      // A token that no longer refreshes cannot revoke anything, and that is
      // not a reason to refuse the disconnection the patient asked for.
      console.error('[wearables/disconnect] withings revoke:', e?.message);
    }
  }

  // The tokens go (activity 074, T-10). Keeping a sealed access token for a
  // connection the patient asked us to drop is a liability with no use: it
  // still opens their health record at the provider, and nothing here will
  // ever call it again. What was already synced stays — that is their record,
  // and deleting it is a different request, made on purpose.
  await (prisma as any).wearableConnection.update({
    where: { id: connection.id },
    data: {
      status: 'DISCONNECTED',
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
    },
  });

  // Withings has no endpoint that revokes a token on the application's behalf:
  // only the account holder can, from their own Withings account. Saying so is
  // better than implying an "unlink" we cannot perform — the screen shows this
  // link, so "disconnected" does not quietly mean "half disconnected".
  const providerRevokeUrl =
    provider.toUpperCase() === 'WITHINGS' ? 'https://account.withings.com/partner/my_apps' : null;

  return NextResponse.json({ ok: true, providerRevokeUrl });
}
