export const dynamic = 'force-dynamic';

import { patientGate } from "@/lib/patient-gate";
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getEffectiveUser } from '@/lib/get-effective-user';

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

  return NextResponse.json({ data: dataPoints });
}
