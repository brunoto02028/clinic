import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, isStaff } from "@/lib/tenant-access";

export const dynamic = "force-dynamic";

// GET — lists past recording sessions for the whole clinic (activity 64,
// T-7), not just the requesting therapist's own — any THERAPIST/ADMIN of
// the clinic may need to find a session someone else started.
//
// Manual keyset pagination (createdAt+id boundary via OR), not Prisma's
// native `cursor` option — the native cursor looks the cursor row up by id
// first and returns nothing if that row no longer matches the `where`
// filter (e.g. it was deleted, or its therapist was offboarded and the
// relation cascaded), silently truncating the rest of the list instead of
// resuming from the next row. A boundary condition on the actual sort
// values has no such dependency on the cursor row still existing (code
// review finding, activity 64 T-7). `id` is a secondary sort key so two
// sessions sharing the same `createdAt` millisecond can never cause one to
// be skipped either (earlier QA finding, same task).
export async function GET(req: NextRequest) {
  const actor = await getActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isStaff(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!actor.clinicId) return NextResponse.json({ error: "No clinic context" }, { status: 400 });

  const before = req.nextUrl.searchParams.get("before");
  let cursor: { createdAt: Date; id: string } | null = null;
  if (before) {
    const [iso, id] = before.split("_");
    const createdAt = new Date(iso);
    if (id && !isNaN(createdAt.getTime())) cursor = { createdAt, id };
  }

  const sessions = await prisma.ambientRecordingSession.findMany({
    where: {
      clinicId: actor.clinicId,
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: cursor.createdAt } },
              { createdAt: cursor.createdAt, id: { lt: cursor.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 25,
    select: {
      id: true,
      status: true,
      language: true,
      startedAt: true,
      endedAt: true,
      durationSeconds: true,
      createdAt: true,
      therapist: { select: { firstName: true, lastName: true } },
      patient: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  const last = sessions[sessions.length - 1];
  return NextResponse.json({
    sessions,
    nextCursor: sessions.length === 25 ? `${last.createdAt.toISOString()}_${last.id}` : null,
  });
}

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
