export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyWearableState } from '@/lib/wearable-state';
import {
  withingsExchangeCode,
  saveWithingsTokens,
  withingsSubscribe,
  withingsCallbackUrl,
  WITHINGS_APPLI,
} from '@/lib/withings';

const BASE_URL = process.env.NEXTAUTH_URL || 'https://bpr.clinic';
/** Where the app asked to be sent back to — the scheme in mobile/app.json. */
const APP_RETURN = 'bprclinic://wearables';

function back(source: 'web' | 'app', query: string, scope: 'self' | 'clinic' = 'self') {
  // A staff member who just connected the clinic's cuff has no business on the
  // patient's own devices page — they came from the measurements screen and
  // that is where the result belongs.
  if (scope === 'clinic') return NextResponse.redirect(`${BASE_URL}/admin/measurements/inbox?${query}`);
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
  const code = request.nextUrl.searchParams.get('code');
  const claim = verifyWearableState(request.nextUrl.searchParams.get('state'));

  if (!claim) {
    // No valid state: nothing is written, and the patient is told rather than
    // silently returned to a page that claims success.
    return back('web', 'connected=0&error=invalid_state');
  }

  // The provider comes from the signed state, never from the query: the query
  // was what decided which device got marked as connected, and the state did
  // not bind it.
  const provider = claim.provider;
  // Withings we speak to ourselves, so the code has to be exchanged here. The
  // aggregator has already finished its own dance by the time it sends the
  // patient back.
  const isDirect = provider === 'withings';

  if (error) {
    return back(claim.source, `connected=0&error=${encodeURIComponent(error)}`, claim.scope);
  }

  if (isDirect && !code) {
    return back(claim.source, 'connected=0&error=missing_code', claim.scope);
  }

  try {
    // A clinic device is the same OAuth round trip, marked. The clinic comes
    // from the staff member who authorised it, never from the query string.
    const staff = claim.scope === 'clinic'
      ? await prisma.user.findUnique({ where: { id: claim.userId }, select: { clinicId: true } })
      : null;
    const clinicFields = claim.scope === 'clinic' && staff?.clinicId
      ? { isClinicDevice: true, clinicId: staff.clinicId, deviceLabel: 'Clinic device' }
      : {};

    const connection = await (prisma as any).wearableConnection.upsert({
      where: { userId_provider: { userId: claim.userId, provider: provider.toUpperCase() } },
      create: {
        userId: claim.userId,
        provider: provider.toUpperCase(),
        ...clinicFields,
        // A direct provider counts as connected only once its tokens are in
        // hand, immediately below. A row saying CONNECTED with no usable token
        // is a lie that surfaces weeks later as "why is there no data?".
        status: isDirect ? 'DISCONNECTED' : 'CONNECTED',
        lastSyncedAt: isDirect ? null : new Date(),
      },
      update: isDirect ? { ...clinicFields } : { status: 'CONNECTED', lastSyncedAt: new Date(), ...clinicFields },
    });

    if (isDirect) {
      const tokens = await withingsExchangeCode(
        code as string,
        `${BASE_URL}/api/wearables/callback`
      );
      await saveWithingsTokens(connection.id, tokens);

      // Ask Withings to tell us when a measurement is taken (T-9). Failing
      // here must not fail the connection: the patient is standing in front of
      // a redirect, the data still arrives on the scheduled sync, and a
      // subscription can be created later. It is logged, not hidden.
      const callbackUrl = withingsCallbackUrl();
      await Promise.all(
        [WITHINGS_APPLI.BLOOD_PRESSURE, WITHINGS_APPLI.WEIGHT, WITHINGS_APPLI.ACTIVITY, WITHINGS_APPLI.SLEEP].map((appli) =>
          withingsSubscribe(tokens.accessToken, callbackUrl, appli).catch((err) =>
            console.error(`[wearables/callback] notify subscribe appli=${appli}:`, err?.message)
          )
        )
      );
    }
  } catch (e: any) {
    console.error('[wearables/callback] exchange failed:', e?.message);
    return back(claim.source, 'connected=0&error=exchange_failed', claim.scope);
  }

  return back(claim.source, `connected=1&provider=${encodeURIComponent(provider)}`, claim.scope);
}
