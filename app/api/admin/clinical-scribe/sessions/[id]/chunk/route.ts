import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, isStaff } from "@/lib/tenant-access";
import { uploadToR2, listR2 } from "@/lib/r2";

export const dynamic = "force-dynamic";

// POST — uploads one audio chunk of a live ambient-recording session
// (activity 64, T-2). Called repeatedly while the recording is happening
// (every ~30s from the client), not just once at the end — this is the
// whole point: a chunk that made it here is durable, so a crash mid-session
// loses at most the one chunk still in flight, never the whole recording.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isStaff(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // Fail closed: an actor with no resolved clinic must never fall through to
  // an unfiltered `findFirst` below (Prisma drops an `undefined` where-field
  // entirely rather than matching nothing, which would open every tenant's
  // sessions to this endpoint).
  if (!actor.clinicId) return NextResponse.json({ error: "No clinic context" }, { status: 400 });

  const session = await prisma.ambientRecordingSession.findFirst({
    where: { id: params.id, clinicId: actor.clinicId },
    select: { id: true, status: true },
  });
  // 404, not 403 — same reasoning as staffPatientAccess: don't confirm a
  // session id exists in another tenant.
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.status !== "RECORDING") {
    return NextResponse.json({ error: "Session is not accepting chunks" }, { status: 400 });
  }

  // Next's FormData type (undici) doesn't line up with lib.dom's here —
  // same pre-existing TS quirk as app/api/patient/consultation-recording.
  const formData = await req.formData().catch(() => null) as FormData | null;
  const audio = formData?.get("audio");
  const chunkIndexRaw = formData?.get("chunkIndex");
  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json({ error: "No audio chunk provided" }, { status: 400 });
  }
  // Reject explicitly rather than let `Number(null)` coerce a missing field
  // to 0 and silently overwrite chunk-00000.
  if (typeof chunkIndexRaw !== "string" || chunkIndexRaw.trim() === "") {
    return NextResponse.json({ error: "Invalid chunkIndex" }, { status: 400 });
  }
  const chunkIndex = Number(chunkIndexRaw);
  if (!Number.isInteger(chunkIndex) || chunkIndex < 0) {
    return NextResponse.json({ error: "Invalid chunkIndex" }, { status: 400 });
  }

  const key = `consultation-sessions/${session.id}/chunk-${String(chunkIndex).padStart(5, "0")}.webm`;

  // A retry (client-side, or a replayed request) reusing the same index must
  // never overwrite an already-stored chunk and double-count it — without a
  // dedicated chunks table, the R2 object itself is the source of truth for
  // "have we already got this one".
  const existing = await listR2(key);
  if (existing.includes(key)) {
    const current = await prisma.ambientRecordingSession.findUnique({
      where: { id: session.id },
      select: { chunkCount: true },
    });
    return NextResponse.json({ ok: true, chunkCount: current?.chunkCount ?? 0, duplicate: true });
  }

  const buffer = Buffer.from(await audio.arrayBuffer());
  await uploadToR2(key, buffer, "audio/webm");

  const updated = await prisma.ambientRecordingSession.update({
    where: { id: session.id },
    data: { chunkCount: { increment: 1 }, lastChunkAt: new Date() },
    select: { chunkCount: true },
  });

  return NextResponse.json({ ok: true, chunkCount: updated.chunkCount });
}
