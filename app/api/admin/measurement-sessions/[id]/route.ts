export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionStaffActor } from "@/lib/tenant-access";
import { expireStaleSessions } from "@/lib/clinic-device";

/**
 * The state of one measurement window — what the waiting screen polls every
 * three seconds until the reading lands, the window expires, or it is
 * cancelled.
 *
 * Expiry is applied here rather than by a scheduled job: the only moment an
 * expired window matters is the moment someone looks at it.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getSessionStaffActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await (prisma as any).clinicMeasurementSession.findUnique({
    where: { id: params.id },
    select: {
      id: true, clinicId: true, patientId: true, context: true, status: true,
      openedAt: true, expiresAt: true, closedAt: true, connectionId: true,
      patient: { select: { firstName: true, lastName: true } },
      reading: {
        select: { id: true, systolic: true, diastolic: true, heartRate: true, measuredAt: true },
      },
    },
  });

  // Another clinic's session answers exactly like a missing one. The test is
  // "same clinic", not "different clinic when I have one": an actor whose
  // tenant did not resolve has no clinic to match, and the `&&` version let
  // them read any session by id.
  if (!session || !actor.clinicId || session.clinicId !== actor.clinicId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Expiry is applied for this device only. The unfiltered version ran a
  // cross-tenant updateMany on every poll of every open screen — harmless in
  // outcome, since those windows were expiring anyway, but a write outside the
  // caller's tenant every three seconds.
  if (session.status === "OPEN" && session.expiresAt < new Date()) {
    await expireStaleSessions(session.connectionId);
    const fresh = await (prisma as any).clinicMeasurementSession.findUnique({
      where: { id: session.id },
      select: { status: true, closedAt: true },
    });
    return NextResponse.json({ session: { ...session, ...fresh } });
  }

  return NextResponse.json({ session });
}
