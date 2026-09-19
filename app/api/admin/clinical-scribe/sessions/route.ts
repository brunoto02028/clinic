import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, isStaff } from "@/lib/tenant-access";

export const dynamic = "force-dynamic";

// POST — starts a new ambient-recording session (activity 64, T-2). The
// client then uploads chunks against this session id as the recording
// happens — nothing about the recording itself lives here yet.
export async function POST(req: NextRequest) {
  const actor = await getActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isStaff(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!actor.clinicId) return NextResponse.json({ error: "No clinic context" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const patientId: string | null = typeof body?.patientId === "string" ? body.patientId : null;
  const language: string = body?.language === "en" ? "en" : "pt";

  // A patientId, if given, must actually belong to this clinic — never trust
  // a client-supplied id blindly across tenants.
  if (patientId) {
    const patient = await prisma.user.findFirst({
      where: { id: patientId, clinicId: actor.clinicId, role: "PATIENT" },
      select: { id: true },
    });
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const session = await prisma.ambientRecordingSession.create({
    data: {
      clinicId: actor.clinicId,
      therapistId: actor.userId,
      patientId,
      language,
    },
  });

  return NextResponse.json({ sessionId: session.id }, { status: 201 });
}
