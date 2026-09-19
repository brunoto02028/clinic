import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, isStaff } from "@/lib/tenant-access";
import { mergeSessionChunks } from "@/lib/ambient-recording";

export const dynamic = "force-dynamic";

// POST — marks a live ambient-recording session as finished and merges its
// chunks into one audio file (activity 64, T-4). Called once the client has
// confirmed every chunk upload landed (see AmbientScribe's onstop handler),
// so the merge always sees the complete set.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isStaff(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // Same fail-closed rule as the chunk route — never let a null clinicId
  // fall through to an unfiltered query.
  if (!actor.clinicId) return NextResponse.json({ error: "No clinic context" }, { status: 400 });

  const session = await prisma.ambientRecordingSession.findFirst({
    where: { id: params.id, clinicId: actor.clinicId },
  });
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  // Idempotent: a retried/duplicate "finish" call (double-click, network
  // retry) on a session that's already past RECORDING just returns the
  // current state instead of erroring or re-merging.
  if (session.status !== "RECORDING") {
    return NextResponse.json({ session });
  }

  const ended = await prisma.ambientRecordingSession.update({
    where: { id: session.id },
    data: { status: "ENDED", endedAt: new Date() },
  });

  // Synchronous — a consultation-length recording is at most tens of MB,
  // comfortably within one request on this app's own Node server (not a
  // serverless function with a hard timeout).
  await mergeSessionChunks(session.id);

  const final = await prisma.ambientRecordingSession.findUnique({ where: { id: session.id } });
  return NextResponse.json({ session: final ?? ended });
}
