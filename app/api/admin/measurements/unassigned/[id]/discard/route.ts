export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionStaffActor } from "@/lib/tenant-access";
import { logAudit } from "@/lib/system-logger";

/**
 * Throwing away a reading that belongs to nobody — the therapist testing the
 * cuff, a visitor who tried it.
 *
 * A reason is required. Discarding is a decision about a clinical measurement,
 * and the one question anyone asks later is "why is this not in the record?".
 * Nothing is deleted: the row stays, marked, with who and when.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getSessionStaffActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 3) {
    return NextResponse.json(
      {
        error: "A short reason is required",
        errorPt: "É preciso dizer o motivo, em poucas palavras",
      },
      { status: 400 }
    );
  }

  const measurement = await (prisma as any).unassignedMeasurement.findUnique({
    where: { id: params.id },
    select: { id: true, clinicId: true, systolic: true, diastolic: true, assignedAt: true, discardedAt: true },
  });
  if (!measurement || !actor.clinicId || measurement.clinicId !== actor.clinicId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (measurement.assignedAt || measurement.discardedAt) {
    return NextResponse.json({ error: "This measurement has already been handled" }, { status: 409 });
  }

  await (prisma as any).unassignedMeasurement.update({
    where: { id: measurement.id },
    data: { discardedById: actor.userId, discardedAt: new Date(), discardReason: reason.slice(0, 500) },
  });

  await logAudit({
    userId: actor.userId,
    userEmail: "",
    userRole: actor.role,
    action: "CLINIC_MEASUREMENT_DISCARD",
    entity: "UnassignedMeasurement",
    entityId: measurement.id,
    description: `Unassigned reading ${measurement.systolic}/${measurement.diastolic} discarded`,
    metadata: { reason },
  });

  return NextResponse.json({ ok: true });
}
