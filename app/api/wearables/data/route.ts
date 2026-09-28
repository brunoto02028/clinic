export const dynamic = 'force-dynamic';

import { patientGate } from "@/lib/patient-gate";
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getEffectiveUser } from '@/lib/get-effective-user';
import { lerEcg } from '@/lib/ecg-record';

export async function GET(request: NextRequest) {
  // Consentimento e plano valem no servidor, não só na tela (auditoria de paridade, 24/09/2026).
  const __gate = await patientGate({ module: "mod_devices" });
  if (__gate.response) return __gate.response;

  const eff = await getEffectiveUser();
  if (!eff) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const days = parseInt(request.nextUrl.searchParams.get('days') || '30');
  const dataType = request.nextUrl.searchParams.get('type') || undefined;

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split('T')[0];

  const dataPoints = await (prisma as any).wearableDataPoint.findMany({
    where: {
      userId: eff.userId,
      dataDate: { gte: sinceStr },
      ...(dataType ? { dataType } : {}),
    },
    orderBy: { dataDate: 'desc' },
  });

  /**
   * O ECG chega lido (099 T-1).
   *
   * O ponto guarda a conclusao do aparelho dentro de `rawPayload`, e nenhuma
   * tela abria esse JSON — entao o ECG existia no banco e em lugar nenhum. A
   * rota entrega o registro ja lido, e as telas so mostram.
   *
   * `rawPayload` nao sai daqui: o que a tela precisa e a conclusao, e mandar o
   * JSON inteiro convidaria cada tela a interpretar por conta propria.
   */
  const comEcg = dataPoints.map((p: any) => {
    const { rawPayload, ...resto } = p;
    const ecg = lerEcg(p);
    return ecg ? { ...resto, ecg } : resto;
  });

  return NextResponse.json({ data: comEcg });
}
