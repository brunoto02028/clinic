export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { labStaff, labOrderInclude, previousValuesFor } from "@/lib/lab-admin";

/**
 * Um pedido inteiro, para a tela de liberação (081, T-2): o resultado com as
 * faixas, os valores anteriores dos mesmos biomarcadores deste paciente, e o
 * prazo que a clínica prometeu.
 *
 * Fora do tenant responde 404, não 403: um pedido de outra clínica é um pedido
 * que não existe.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await labStaff(request);
  if ("response" in guard) return guard.response;
  const { clinicId } = guard.actor;
  const { id } = await params;

  const order = await prisma.labOrder.findFirst({ where: { id, clinicId }, include: labOrderInclude() });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const biomarkers = Array.from(new Set(order.registrations.flatMap((r) => r.values.map((v) => v.biomarker))));
  const [previous, clinic] = await Promise.all([
    previousValuesFor(clinicId, order.patientId, order.id, biomarkers),
    prisma.clinic.findUnique({ where: { id: clinicId }, select: { labReviewDays: true } }),
  ]);

  const cost = order.items.reduce((s, i) => s + i.unitCost * i.quantity, 0);
  const sold = order.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  return NextResponse.json({
    order: {
      ...order,
      cost: Math.round(cost * 100) / 100,
      margin: Math.round((sold - cost) * 100) / 100,
      awaitingRelease: order.status === "RESULTS_READY" && !order.releasedToPatientAt,
      hasValues: order.registrations.some((r) => r.values.length > 0),
    },
    previous,
    labReviewDays: clinic?.labReviewDays ?? 2,
  });
}
