export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionStaffActor } from "@/lib/tenant-access";

/**
 * A fila da clínica: o que o paciente mandou e ninguém ainda viu.
 *
 * `clinicId` do ator entra no `where` sempre, nunca vem da query — foi
 * exatamente por confiar no papel sem comparar a clínica que
 * `/api/files/[id]` deixou terapeuta de uma clínica abrir o arquivo de
 * paciente de outra, durante meses.
 */
export async function GET(req: NextRequest) {
  const actor = await getSessionStaffActor(req);
  if (!actor?.clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pendentes = req.nextUrl.searchParams.get("pending") === "1";
  const patientId = req.nextUrl.searchParams.get("patientId");

  const submissions = await (prisma as any).exerciseSubmission.findMany({
    where: {
      clinicId: actor.clinicId,
      ...(pendentes ? { reviewedAt: null } : {}),
      ...(patientId ? { patientId } : {}),
    },
    orderBy: { submittedAt: "desc" },
    take: 100,
    select: {
      id: true,
      kind: true,
      mimeType: true,
      durationSeconds: true,
      submittedAt: true,
      reviewedAt: true,
      reviewNote: true,
      patient: { select: { id: true, firstName: true, lastName: true } },
      exercisePrescription: { select: { id: true, exercise: { select: { name: true } } } },
      protocolItem: { select: { id: true, title: true } },
      reviewedBy: { select: { firstName: true, lastName: true } },
    },
  });

  return NextResponse.json({ submissions, count: submissions.length });
}
