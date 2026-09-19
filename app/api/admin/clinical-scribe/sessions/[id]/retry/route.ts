import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, isStaff } from "@/lib/tenant-access";

export const dynamic = "force-dynamic";

// POST — re-queues a FAILED session for transcription (activity 64, T-6).
// Only makes sense when the merge already succeeded (mergedAudioR2Key set)
// — a session that failed before ever producing audio (e.g. "no chunks
// were ever saved") has nothing to retry from.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isStaff(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!actor.clinicId) return NextResponse.json({ error: "No clinic context" }, { status: 400 });

  const session = await prisma.ambientRecordingSession.findFirst({
    where: { id: params.id, clinicId: actor.clinicId },
  });
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.status !== "FAILED") {
    return NextResponse.json({ error: "Only a FAILED session can be retried" }, { status: 400 });
  }
  if (!session.mergedAudioR2Key) {
    return NextResponse.json({ error: "No merged audio to retry from" }, { status: 400 });
  }

  const updated = await prisma.ambientRecordingSession.update({
    where: { id: session.id },
    data: { status: "TRANSCRIBING", error: null, assemblyaiTranscriptId: null, attempts: 0 },
  });

  return NextResponse.json({ session: updated });
}
