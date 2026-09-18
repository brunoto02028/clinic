import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor } from "@/lib/tenant-access";
import { logAudit } from "@/lib/system-logger";

export const dynamic = "force-dynamic";

// The only new write of activity 48 — everything else in the patient
// timeline (specs/048-atividade-do-paciente) already had a source to read
// from; "watched a video" didn't. Reuses the AuditLog model, same as login.
export async function POST(req: NextRequest) {
  const actor = await getActor(req);
  if (!actor || actor.role !== "PATIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const exerciseId = body?.exerciseId;
  if (typeof exerciseId !== "string" || !exerciseId) {
    return NextResponse.json({ error: "exerciseId is required" }, { status: 400 });
  }

  const [exercise, patient] = await Promise.all([
    prisma.exercise.findUnique({ where: { id: exerciseId }, select: { name: true, clinicId: true } }),
    prisma.user.findUnique({
      where: { id: actor.userId },
      select: { email: true, role: true, firstName: true, lastName: true },
    }),
  ]);
  // Scoped to the patient's own clinic, same as every other route reading an
  // exercise for a patient (e.g. app/api/patient/protocol/route.ts) — without
  // this, any authenticated patient could log having watched an arbitrary
  // exercise from another clinic into their own timeline.
  if (!exercise || !patient || !actor.clinicId || exercise.clinicId !== actor.clinicId) {
    return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
  }

  await logAudit({
    userId: actor.userId,
    userEmail: patient.email,
    userRole: patient.role,
    userName: `${patient.firstName} ${patient.lastName}`,
    action: "VIDEO_WATCHED",
    entity: "Exercise",
    entityId: exerciseId,
    description: `${patient.firstName} ${patient.lastName} watched the video for "${exercise.name}"`,
  });

  return new NextResponse(null, { status: 204 });
}
