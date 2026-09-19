import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { prisma } from "@/lib/db";
import { getActor, isStaff } from "@/lib/tenant-access";
import { getR2ObjectStream } from "@/lib/r2";

export const dynamic = "force-dynamic";

// GET — streams a session's merged audio back to an authenticated staff
// member of the right clinic (activity 64, T-6). Never the R2 public URL —
// same reasoning as everywhere else in this activity: consultation audio is
// too sensitive for a permanent public link (see lib/ambient-recording.ts).
// Supports byte-range requests so the <audio> player can seek in a long
// recording without downloading the whole file first.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getActor(req);
  if (!actor || !isStaff(actor) || !actor.clinicId) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const session = await prisma.ambientRecordingSession.findFirst({
    where: { id: params.id, clinicId: actor.clinicId },
    select: { mergedAudioR2Key: true },
  });
  if (!session?.mergedAudioR2Key) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const range = req.headers.get("range") || undefined;
  let stream;
  try {
    stream = await getR2ObjectStream(session.mergedAudioR2Key, range);
  } catch (err: any) {
    // An unsatisfiable Range (e.g. a seek past the end of the file) is a
    // recoverable client error, not a missing object — don't mask it as 404.
    if (err?.name === "InvalidRange") {
      return new NextResponse("Range Not Satisfiable", { status: 416 });
    }
    return new NextResponse("Not Found", { status: 404 });
  }

  const headers: Record<string, string> = {
    "Content-Type": stream.contentType || "audio/webm",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
  };
  if (stream.contentLength != null) headers["Content-Length"] = String(stream.contentLength);
  if (stream.contentRange) headers["Content-Range"] = stream.contentRange;

  return new NextResponse(Readable.toWeb(stream.body) as any, {
    status: stream.contentRange ? 206 : 200,
    headers,
  });
}
