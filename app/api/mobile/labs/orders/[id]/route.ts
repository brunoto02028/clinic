export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getMobileUser } from "@/lib/mobile-auth-guard";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";
import { loadPatientOrder, patientOrder, patientResult } from "@/lib/lab-patient";

export function OPTIONS() {
  return corsPreflight();
}

/**
 * Um pedido do paciente com o estágio, a linha do tempo e — só se liberado —
 * o resultado (081, T-3). Não liberado: `result` é `null`, e nada no corpo
 * sugere que já existe.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = getMobileUser(request);
  if (!payload) return corsJson({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const order = await loadPatientOrder(id, payload.sub);
  if (!order) return corsJson({ error: "Order not found", errorPt: "Pedido não encontrado" }, { status: 404 });

  const clinic = order.clinicId
    ? await prisma.clinic.findUnique({ where: { id: order.clinicId }, select: { labReviewDays: true } })
    : null;

  return corsJson({
    order: patientOrder(order),
    result: await patientResult(order),
    reviewDays: clinic?.labReviewDays ?? 2,
  });
}

/**
 * Existia um PATCH que marcava o pedido como `CONFIRMED` sem pagamento —
 * "Order confirmed by patient". Era o paciente confirmando a própria compra
 * sem pagar, o mesmo buraco da F8 da 080. A confirmação vem do webhook do
 * Stripe (T-6) e de mais ninguém.
 */
export async function PATCH() {
  return corsJson(
    { error: "Orders are confirmed by payment, not by the app.", errorPt: "O pedido é confirmado pelo pagamento, não pelo app.", code: "gone" },
    { status: 410 }
  );
}
