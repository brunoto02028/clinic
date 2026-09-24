export const dynamic = 'force-dynamic';

import { patientGate } from "@/lib/patient-gate";
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { owSyncUser } from '@/lib/open-wearables';
import { ingestWithings } from '@/lib/withings-ingest';
import { getEffectiveUser } from '@/lib/get-effective-user';

export async function POST(request: NextRequest) {
  // Consentimento e plano valem no servidor, não só na tela (auditoria de paridade, 24/09/2026).
  const __gate = await patientGate({ module: "mod_devices" });
  if (__gate.response) return __gate.response;

  const eff = await getEffectiveUser();
  if (!eff) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { provider } = await request.json();
  const userId = eff.userId;

  const connection = await (prisma as any).wearableConnection.findFirst({
    where: { userId, provider: provider.toUpperCase(), status: 'CONNECTED' },
  });

  if (!connection) {
    return NextResponse.json({ error: 'Not connected' }, { status: 404 });
  }

  // Withings we read ourselves, so a sync is a real fetch that returns counts
  // rather than an instruction for someone else to do it later.
  if (provider.toLowerCase() === 'withings') {
    try {
      const counts = await ingestWithings(userId, connection);
      return NextResponse.json({ ok: true, ...counts });
    } catch (e: any) {
      console.error('[wearables/sync] withings:', e?.message);
      await (prisma as any).wearableConnection.update({
        where: { id: connection.id },
        data: { status: 'ERROR' },
      });
      return NextResponse.json({ error: e?.message || 'Sync failed' }, { status: 502 });
    }
  }

  if (!connection.owUserId) {
    return NextResponse.json({ error: 'Not connected' }, { status: 404 });
  }

  await owSyncUser(provider.toLowerCase(), connection.owUserId);

  return NextResponse.json({ ok: true, message: 'Sync initiated' });
}
