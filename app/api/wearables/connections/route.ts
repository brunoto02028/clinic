export const dynamic = 'force-dynamic';

import { patientGate } from "@/lib/patient-gate";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getEffectiveUser } from '@/lib/get-effective-user';
import { deliveryState, ensureCheckedSoon, bloodPressureMissing } from '@/lib/withings-subscriptions';

export async function GET() {
  // Consentimento e plano valem no servidor, não só na tela (auditoria de paridade, 24/09/2026).
  const __gate = await patientGate({ module: "mod_devices" });
  if (__gate.response) return __gate.response;

  const eff = await getEffectiveUser();
  if (!eff) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const connections = await (prisma as any).wearableConnection.findMany({
    where: { userId: eff.userId, status: 'CONNECTED' },
    select: {
      id: true,
      provider: true,
      status: true,
      lastSyncedAt: true,
      createdAt: true,
      notifyConfirmedAppli: true,
      notifyCheckedAt: true,
      accessToken: true,
      refreshToken: true,
      tokenExpiresAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Uma conexão anterior a este trabalho nunca foi perguntada. Confere em
  // segundo plano na primeira vez que alguém abre a lista, em vez de ficar
  // `unchecked` para sempre.
  for (const c of connections) {
    if (c.provider === 'WITHINGS') ensureCheckedSoon(c);
  }

  // `status: CONNECTED` only ever meant "the authorisation worked". Whether
  // anything is actually coming is a second question, and until activity 075
  // nothing asked it — a device could be authorised and silent and look
  // exactly like one that was working.
  return NextResponse.json({
    // Só a Withings escreve essas colunas, e só ela tem como reassinar. Mandar
    // `delivery` para os outros provedores seria um dado que a tela pintaria de
    // âmbar com um texto sobre a Withings e sem botão nenhum para resolver.
    connections: connections.map((c: any) => ({
      id: c.id,
      provider: c.provider,
      status: c.status,
      lastSyncedAt: c.lastSyncedAt,
      createdAt: c.createdAt,
      delivery: c.provider === 'WITHINGS' ? deliveryState(c) : undefined,
      // Numa clínica construída em torno da pressão, faltar pressão e faltar
      // sono não são a mesma notícia — e "enviando só parte" escondia as duas
      // atrás da mesma frase.
      missingBloodPressure: c.provider === 'WITHINGS' ? bloodPressureMissing(c) : undefined,
    })),
  });
}
