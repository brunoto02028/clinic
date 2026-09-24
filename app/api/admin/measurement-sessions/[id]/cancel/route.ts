export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionStaffActor } from "@/lib/tenant-access";
import { logAudit } from "@/lib/system-logger";

/** Closing the window on purpose — the patient left, or it was opened by mistake. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getSessionStaffActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await (prisma as any).clinicMeasurementSession.findUnique({
    where: { id: params.id },
    select: { id: true, clinicId: true, status: true, patientId: true },
  });
  if (!session || !actor.clinicId || session.clinicId !== actor.clinicId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (session.status !== "OPEN") {
    // Cancelling a window that already took a reading would orphan that
    // reading's explanation; and "nothing to cancel" is not an error.
    return NextResponse.json({ session, alreadyClosed: true });
  }

  const updated = await (prisma as any).clinicMeasurementSession.update({
    where: { id: session.id },
    data: { status: "CANCELLED", closedAt: new Date(), cancelledById: actor.userId },
    select: { id: true, status: true, closedAt: true },
  });

  await logAudit({
    userId: actor.userId,
    userEmail: "",
    userRole: actor.role,
    action: "CLINIC_MEASUREMENT_SESSION_CANCEL",
    entity: "ClinicMeasurementSession",
    entityId: session.id,
    description: "Measurement window cancelled",
    metadata: { patientId: session.patientId },
  });

  return NextResponse.json({ session: updated });
}
