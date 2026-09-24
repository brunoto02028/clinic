export const dynamic = 'force-dynamic';

import { subscribeAndRecord } from '@/lib/withings-subscriptions';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyWearableState } from '@/lib/wearable-state';
import {
  withingsExchangeCode,
  saveWithingsTokens,
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

      // Ask Withings to tell us when a measurement is taken (T-9), and then
      // ask it what it actually agreed to send (075, T-10). Failing here must
      // not fail the connection: the patient is standing in front of a
      // redirect and a subscription can be created later. What changed is that
      // the outcome is now written on the connection instead of into a log —
      // a device that was authorised and silent used to look exactly like one
      // that was working.
      // A conexão real, não um objeto de nulos: `saveWithingsTokens` acabou de
      // gravar os tokens nela. Com os nulos, remover o override um dia faria
      // `withingsAccessToken` lançar, o catch engolir e **toda** conexão nova
      // nascer marcada como muda, sem nada quebrar visivelmente.
      const outcome = await subscribeAndRecord(
        {
          id: connection.id,
          accessToken: connection.accessToken ?? null,
          refreshToken: connection.refreshToken ?? null,
          tokenExpiresAt: connection.tokenExpiresAt ?? null,
        },
        tokens.accessToken
      );
      if (!outcome.answered) {
        console.error(`[wearables/callback] Withings did not answer the subscription check for connection ${connection.id}`);
      } else if (outcome.missing.length) {
        console.error(
          `[wearables/callback] Withings did not confirm appli=${outcome.missing.join(",")} for connection ${connection.id}`
        );
      }
    }
  } catch (e: any) {
    console.error('[wearables/callback] exchange failed:', e?.message);
    return back(claim.source, 'connected=0&error=exchange_failed', claim.scope);
  }

  return back(claim.source, `connected=1&provider=${encodeURIComponent(provider)}`, claim.scope);
}
