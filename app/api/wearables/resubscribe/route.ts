export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { patientGate } from '@/lib/patient-gate';
import { getEffectiveUser } from '@/lib/get-effective-user';
import { subscribeAndRecord, deliveryState } from '@/lib/withings-subscriptions';
import { rateLimit } from '@/lib/rate-limit';

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

  // Cada POST vira oito chamadas na Withings (quatro subscribe, quatro list) e
  // pode ainda disparar um refresh de token. Sem limite, um paciente
  // autenticado queima a cota da conta da clínica com o dedo no botão.
  const limite = rateLimit(`wearables-resubscribe:${eff.userId}`, { max: 5, windowMs: 10 * 60_000 });
  if (!limite.allowed) {
    return NextResponse.json(
      {
        error: 'Too many attempts. Try again in a few minutes.',
        errorPt: 'Muitas tentativas. Tente de novo em alguns minutos.',
        retryAfter: limite.retryAfter,
      },
      { status: 429 }
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
  // O que a tela mostra tem que ser o que ficou gravado. Antes o retorno era
  // montado em memória, então o app dizia "pronto" enquanto o `invalidate` da
  // mesma função relia o banco e repintava o card de âmbar.
  if (!outcome.answered) {
    return NextResponse.json(
      {
        error: 'We could not reach Withings just now. Nothing was changed.',
        errorPt: 'Não conseguimos falar com a Withings agora. Nada foi alterado.',
        code: 'provider_unreachable',
      },
      { status: 503 }
    );
  }
  return NextResponse.json({
    confirmed: outcome.confirmed,
    missing: outcome.missing,
    checkedAt: outcome.checkedAt,
    recorded: outcome.recorded,
    delivery: outcome.recorded
      ? deliveryState({
          notifyConfirmedAppli: outcome.confirmed,
          notifyCheckedAt: outcome.checkedAt,
        })
      : 'unchecked',
  });
}
