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
  const clinic = await prisma.clinic.findUnique({ where: { id: guard.actor.clinicId }, select: { labReviewDays: true, labVisibleInApp: true } });
  return NextResponse.json({ labReviewDays: clinic?.labReviewDays ?? 2, labVisibleInApp: !!clinic?.labVisibleInApp, canEdit: canSetPrices(guard.actor) });
}

export async function PATCH(request: NextRequest) {
  const guard = await labStaff(request);
  if ("response" in guard) return guard.response;
  if (!canSetPrices(guard.actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const data: { labReviewDays?: number; labVisibleInApp?: boolean } = {};

  if (body.labReviewDays !== undefined) {
    const n = Number(body.labReviewDays);
    if (!Number.isInteger(n) || n < 1 || n > 14) {
      return NextResponse.json({ error: "Between 1 and 14 working days", errorPt: "Entre 1 e 14 dias úteis" }, { status: 400 });
    }
    data.labReviewDays = n;
  }
  if (body.labVisibleInApp !== undefined) data.labVisibleInApp = !!body.labVisibleInApp;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to change", errorPt: "Nada para mudar" }, { status: 400 });
  }

  const before = await prisma.clinic.findUnique({ where: { id: guard.actor.clinicId }, select: { labReviewDays: true, labVisibleInApp: true } });
  const clinic = await prisma.clinic.update({
    where: { id: guard.actor.clinicId },
    data,
    select: { labReviewDays: true, labVisibleInApp: true },
  });

  if (data.labReviewDays !== undefined && before?.labReviewDays !== data.labReviewDays) {
    await auditLab(guard.actor.userId, "LAB_REVIEW_DAYS_CHANGED", "Clinic", guard.actor.clinicId, `lab review window ${before?.labReviewDays} → ${data.labReviewDays} working days`);
  }
  // Ligar e desligar o módulo no app de todo mundo é decisão registrada.
  if (data.labVisibleInApp !== undefined && before?.labVisibleInApp !== data.labVisibleInApp) {
    await auditLab(guard.actor.userId, "LAB_APP_VISIBILITY_CHANGED", "Clinic", guard.actor.clinicId, `lab module ${data.labVisibleInApp ? "shown in" : "hidden from"} the patient app`);
  }

  return NextResponse.json({ labReviewDays: clinic.labReviewDays, labVisibleInApp: clinic.labVisibleInApp });
}
