import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, isStaff } from "@/lib/tenant-access";

export const dynamic = "force-dynamic";

// GET — status of a single ambient-recording session. Used by the client to
// check whether "finish" actually completed server-side after its own
// fetch timed out client-side (the merge can legitimately take longer than
// any reasonable client timeout for a long consultation) — timing out
// doesn't mean it failed, just that the client stopped waiting.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isStaff(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!actor.clinicId) return NextResponse.json({ error: "No clinic context" }, { status: 400 });

  const session = await prisma.ambientRecordingSession.findFirst({
    where: { id: params.id, clinicId: actor.clinicId },
  });
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  return NextResponse.json({ session });
}

// PATCH — associates a patient with a session that didn't have one selected
// when the recording started (activity 64, T-6, plan.md Decisão/Suposição
// 4 — recording can start before there's time to pick a patient).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isStaff(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!actor.clinicId) return NextResponse.json({ error: "No clinic context" }, { status: 400 });

  const session = await prisma.ambientRecordingSession.findFirst({
    where: { id: params.id, clinicId: actor.clinicId },
    select: { id: true },
  });
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const patientId = typeof body?.patientId === "string" ? body.patientId : null;
  if (!patientId) return NextResponse.json({ error: "patientId is required" }, { status: 400 });

  // A patientId must actually belong to this clinic — never trust a
  // client-supplied id blindly across tenants.
  const patient = await prisma.user.findFirst({
    where: { id: patientId, clinicId: actor.clinicId, role: "PATIENT" },
    select: { id: true },
  });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const updated = await prisma.ambientRecordingSession.update({
    where: { id: session.id },
    data: { patientId },
  });

  return NextResponse.json({ session: updated });
}
