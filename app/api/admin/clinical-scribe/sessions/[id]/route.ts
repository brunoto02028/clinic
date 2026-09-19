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
