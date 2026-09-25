export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { labStaff, canSetPrices, auditLab } from "@/lib/lab-admin";

/**
 * O prazo de revisão (081, T-2): quantos dias úteis a clínica promete entre o
 * resultado chegar e ela liberar. É o número que a tela do paciente escreve em
 * "em revisão com o seu terapeuta" — sem prazo, a espera fica aberta.
 */
export async function GET(request: NextRequest) {
  const guard = await labStaff(request);
  if ("response" in guard) return guard.response;
  const clinic = await prisma.clinic.findUnique({ where: { id: guard.actor.clinicId }, select: { labReviewDays: true } });
  return NextResponse.json({ labReviewDays: clinic?.labReviewDays ?? 2, canEdit: canSetPrices(guard.actor) });
}

export async function PATCH(request: NextRequest) {
  const guard = await labStaff(request);
  if ("response" in guard) return guard.response;
  if (!canSetPrices(guard.actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const n = Number(body.labReviewDays);
  if (!Number.isInteger(n) || n < 1 || n > 14) {
    return NextResponse.json({ error: "Between 1 and 14 working days", errorPt: "Entre 1 e 14 dias úteis" }, { status: 400 });
  }

  const before = await prisma.clinic.findUnique({ where: { id: guard.actor.clinicId }, select: { labReviewDays: true } });
  const clinic = await prisma.clinic.update({ where: { id: guard.actor.clinicId }, data: { labReviewDays: n }, select: { labReviewDays: true } });
  if (before?.labReviewDays !== n) {
    await auditLab(guard.actor.userId, "LAB_REVIEW_DAYS_CHANGED", "Clinic", guard.actor.clinicId, `lab review window ${before?.labReviewDays} → ${n} working days`);
  }
  return NextResponse.json({ labReviewDays: clinic.labReviewDays });
}
