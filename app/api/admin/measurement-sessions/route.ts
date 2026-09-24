export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import { getSessionStaffActor } from "@/lib/tenant-access";
import { logAudit } from "@/lib/system-logger";
import { clinicDevice, expireStaleSessions, SESSION_WINDOW_MS } from "@/lib/clinic-device";

/**
 * Opening the window in which the clinic's cuff measures one named patient
 * (activity 074, T-14).
 *
 * The therapist presses "Measure blood pressure" on a patient's record; for
 * the next three minutes, a reading from that device is that patient's. It is
 * the only thing that decides whose record the measurement enters, so it is
 * deliberately explicit, short, and never inferred.
 */

const CONTEXTS = ["PRE_SESSION", "POST_SESSION", "OTHER"] as const;

/** GET — is there a device, and is a window already open on it? */
export async function GET(req: NextRequest) {
  const actor = await getSessionStaffActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!actor.clinicId) return NextResponse.json({ device: null, open: null });

  const device = await clinicDevice(actor.clinicId);
  if (!device) return NextResponse.json({ device: null, open: null });

  await expireStaleSessions(device.id);
  const open = await (prisma as any).clinicMeasurementSession.findFirst({
    where: { connectionId: device.id, status: "OPEN" },
    select: {
      id: true, patientId: true, context: true, openedAt: true, expiresAt: true,
      patient: { select: { firstName: true, lastName: true } },
    },
  });

  return NextResponse.json({ device: { id: device.id, label: device.deviceLabel }, open });
}

/** POST — open a window on this patient. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const patientId = typeof body?.patientId === "string" ? body.patientId : "";
  const context = CONTEXTS.includes(body?.context) ? body.context : "PRE_SESSION";
  if (!patientId) return NextResponse.json({ error: "patientId is required" }, { status: 400 });

  const guard = await staffPatientAccess(req, patientId);
  if (guard.response) return guard.response;
  const clinicId = guard.actor.clinicId;
  if (!clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  const device = await clinicDevice(clinicId);
  if (!device) {
    return NextResponse.json({ error: "This clinic has no measuring device connected" }, { status: 400 });
  }

  await expireStaleSessions(device.id);

  // One window per device. Closing the previous one silently is the kind of
  // convenience that files a reading under the wrong patient, so the second
  // request is refused and says who is waiting.
  const open = await (prisma as any).clinicMeasurementSession.findFirst({
    where: { connectionId: device.id, status: "OPEN" },
    select: {
      id: true, patientId: true, expiresAt: true,
      patient: { select: { firstName: true, lastName: true } },
    },
  });
  if (open) {
    return NextResponse.json(
      {
        error: "A measurement is already in progress on this device",
        errorPt: "Já existe uma medição em andamento neste aparelho",
        open,
      },
      { status: 409 }
    );
  }

  const now = new Date();
  const session = await (prisma as any).clinicMeasurementSession.create({
    data: {
      clinicId,
      patientId,
      connectionId: device.id,
      context,
      status: "OPEN",
      openedById: guard.actor.userId,
      openedAt: now,
      expiresAt: new Date(now.getTime() + SESSION_WINDOW_MS),
    },
    select: { id: true, patientId: true, context: true, openedAt: true, expiresAt: true, status: true },
  });

  await logAudit({
    userId: guard.actor.userId,
    userEmail: "",
    userRole: guard.actor.role,
    action: "CLINIC_MEASUREMENT_SESSION_OPEN",
    entity: "ClinicMeasurementSession",
    entityId: session.id,
    description: `Measurement window opened on ${device.deviceLabel ?? "clinic device"}`,
    metadata: { patientId, context, expiresAt: session.expiresAt },
  });

  return NextResponse.json({ session, device: { id: device.id, label: device.deviceLabel } });
}
