export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { patientGate } from '@/lib/patient-gate';
import { getEffectiveUser } from '@/lib/get-effective-user';
import { subscribeAndRecord, deliveryState } from '@/lib/withings-subscriptions';

/**
 * Asking Withings again to send us measurements.
 *
 * The subscription is made during the OAuth callback and is allowed to fail
 * there — the patient is mid-redirect, and losing the connection over a
 * notification would be worse. What was missing was any way to try again:
 * until now the only remedy for a device that was authorised and silent was to
 * disconnect and authorise all over again, and nobody knew to do that because
 * nothing said the device was silent (activity 075, T-10).
 *
 * The OAuth is untouched — the tokens are already ours. This only re-asks.
 */
export async function POST() {
  const __gate = await patientGate({ module: 'mod_devices' });
  if (__gate.response) return __gate.response;

  const eff = await getEffectiveUser();
  if (!eff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // Read-only during impersonation, like every other write a patient owns: an
  // admin previewing the portal must not be acting at the provider.
  if (eff.isImpersonating) {
    return NextResponse.json(
      { error: 'Read-only during impersonation', errorPt: 'Somente leitura durante a visualização' },
      { status: 403 }
    );
  }

  const connection = await (prisma as any).wearableConnection.findFirst({
    where: { userId: eff.userId, provider: 'WITHINGS', status: 'CONNECTED' },
    select: { id: true, accessToken: true, refreshToken: true, tokenExpiresAt: true },
  });
  if (!connection) {
    return NextResponse.json(
      {
        error: 'No connected Withings device',
        errorPt: 'Nenhum aparelho Withings conectado',
        code: 'no_connection',
      },
      { status: 404 }
    );
  }

  const outcome = await subscribeAndRecord(connection);
  return NextResponse.json({
    confirmed: outcome.confirmed,
    missing: outcome.missing,
    checkedAt: outcome.checkedAt,
    delivery: deliveryState({
      notifyConfirmedAppli: outcome.confirmed,
      notifyCheckedAt: outcome.checkedAt,
    }),
  });
}
