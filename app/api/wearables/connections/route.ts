export const dynamic = 'force-dynamic';

import { patientGate } from "@/lib/patient-gate";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getEffectiveUser } from '@/lib/get-effective-user';
import { deliveryState } from '@/lib/withings-subscriptions';

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
    },
    orderBy: { createdAt: 'desc' },
  });

  // `status: CONNECTED` only ever meant "the authorisation worked". Whether
  // anything is actually coming is a second question, and until activity 075
  // nothing asked it — a device could be authorised and silent and look
  // exactly like one that was working.
  return NextResponse.json({
    connections: connections.map((c: any) => ({
      ...c,
      delivery: deliveryState(c),
    })),
  });
}
