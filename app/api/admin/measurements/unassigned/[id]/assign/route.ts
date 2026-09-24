export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import { logAudit } from "@/lib/system-logger";

/**
 * Filing a reading that arrived without a window, into the record it belongs
 * to (activity 074, T-15).
 *
 * The therapist says whose it is; the system never decides that on its own.
 * The guard is `staffPatientAccess` on the *target patient*, so a reading
 * cannot be filed into another clinic's record even by id.
 */

const CONTEXTS = ["PRE_SESSION", "POST_SESSION", "HOME", "OTHER"] as const;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const patientId = typeof body?.patientId === "string" ? body.patientId : "";
  const context = CONTEXTS.includes(body?.context) ? body.context : "OTHER";
  if (!patientId) return NextResponse.json({ error: "patientId is required" }, { status: 400 });

  const guard = await staffPatientAccess(req, patientId);
  if (guard.response) return guard.response;
  const clinicId = guard.actor.clinicId;

  const measurement = await (prisma as any).unassignedMeasurement.findUnique({
    where: { id: params.id },
    select: {
      id: true, clinicId: true, connectionId: true, systolic: true, diastolic: true,
      heartRate: true, measuredAt: true, withingsMeasureId: true,
      assignedAt: true, discardedAt: true,
    },
  });
  if (!measurement || !clinicId || measurement.clinicId !== clinicId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (measurement.assignedAt || measurement.discardedAt) {
    // Two therapists opening the same inbox is ordinary; the second one is
    // told what happened instead of filing the reading twice.
    return NextResponse.json({ error: "This measurement has already been handled" }, { status: 409 });
  }

  const reading = await (prisma as any).bloodPressureReading.create({
    data: {
      patientId,
      clinicId: measurement.clinicId,
      systolic: measurement.systolic,
      diastolic: measurement.diastolic,
      heartRate: measurement.heartRate,
      method: "CLINIC_DEVICE",
      source: "CLINIC_DEVICE",
      context,
      recordedById: guard.actor.userId,
      measuredAt: measurement.measuredAt,
      withingsMeasureId: measurement.withingsMeasureId,
      notes: "Withings (clinic device, assigned manually)",
    },
    select: { id: true, systolic: true, diastolic: true, measuredAt: true },
  });

  await (prisma as any).unassignedMeasurement.update({
    where: { id: measurement.id },
    data: { assignedPatientId: patientId, assignedById: guard.actor.userId, assignedAt: new Date() },
  });

  // A reading assigned by hand is a reading recorded: same alert path as any
  // other, or a 210/130 that sat in the inbox for an hour would reach the
  // record and stop there.
  const { afterBloodPressureRecorded } = await import("@/lib/bp-alerts");
  await afterBloodPressureRecorded({
    patientId,
    clinicId: measurement.clinicId,
    systolic: measurement.systolic,
    diastolic: measurement.diastolic,
    measuredAt: new Date(measurement.measuredAt),
    via: "assigned",
  }).catch((e) => console.error("[measurements/assign] alert failed:", e?.message));

  await logAudit({
    userId: guard.actor.userId,
    userEmail: "",
    userRole: guard.actor.role,
    action: "CLINIC_MEASUREMENT_ASSIGN",
    entity: "BloodPressureReading",
    entityId: reading.id,
    description: `Unassigned reading ${measurement.systolic}/${measurement.diastolic} assigned by hand`,
    metadata: { measurementId: measurement.id, patientId, context, automatic: false },
  });

  return NextResponse.json({ reading });
}
