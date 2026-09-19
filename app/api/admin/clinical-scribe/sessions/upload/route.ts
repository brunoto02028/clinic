import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, isStaff } from "@/lib/tenant-access";
import { uploadToR2 } from "@/lib/r2";

export const dynamic = "force-dynamic";

// 500MB (plan.md Suposição 8) — a 90min consultation in a phone's default
// compressed format (m4a/opus) is normally well under this; it's a safety
// ceiling against uploading the wrong/corrupted giant file, not an expected
// real size.
const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;

// `Content-Type`/extension alone are trivially spoofable (a plain-text file
// renamed to `.mp3` is reported as `audio/mpeg` by a browser and passed
// straight through) — QA (T-8) reproduced exactly this with the qa-spec's
// own "renamed .txt" scenario, which must be rejected. This checks the
// actual file signature instead, covering webm, ogg/opus, wav, mp3, aac,
// flac and mp4/m4a.
function hasAudioMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  // WebM / Matroska (EBML header) — also opus/vorbis-in-webm.
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) return true;
  // Ogg ("OggS") — also opus/vorbis-in-ogg.
  if (buffer.toString("ascii", 0, 4) === "OggS") return true;
  // WAV ("RIFF"...."WAVE")
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WAVE") return true;
  // MP3 with an ID3 tag
  if (buffer.toString("ascii", 0, 3) === "ID3") return true;
  // MP3/AAC-ADTS frame sync (no ID3 tag) — first 11 bits all set
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) return true;
  // FLAC
  if (buffer.toString("ascii", 0, 4) === "fLaC") return true;
  // MP4/M4A (ISO base media — "ftyp" box at offset 4)
  if (buffer.length >= 8 && buffer.toString("ascii", 4, 8) === "ftyp") return true;
  return false;
}

// POST — accepts one already-complete audio file (activity 64, T-8): either
// a "local" recording done entirely client-side (no internet during the
// consultation, uploaded whole once connectivity returns) or an audio file
// recorded by some other means (e.g. a phone's own recorder app) and
// uploaded manually. Skips the chunked-upload pipeline (T-2/T-4) entirely —
// the client already has the whole file — and lands the session directly in
// the same TRANSCRIBING state T-4's merge job would, so T-5's polling job
// picks it up exactly the same way regardless of how the audio got there
// (plan.md Decisão 6).
export async function POST(req: NextRequest) {
  const actor = await getActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isStaff(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!actor.clinicId) return NextResponse.json({ error: "No clinic context" }, { status: 400 });

  // Reject an oversized body BEFORE `req.formData()` buffers it entirely
  // into memory — the `audio.size` check below runs only after that parse
  // already paid the memory cost, so it protects nothing on its own for a
  // request this large (code review finding, activity 64 T-8). Multipart
  // framing adds some overhead on top of the file itself, hence the slack.
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > MAX_UPLOAD_BYTES * 1.1) {
    return NextResponse.json({ error: `File too large (max ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB)` }, { status: 413 });
  }

  const formData = await req.formData().catch(() => null) as FormData | null;
  const audio = formData?.get("audio");
  const patientIdRaw = formData?.get("patientId");
  const languageRaw = formData?.get("language");

  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
  }
  if (audio.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: `File too large (max ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB)` }, { status: 400 });
  }
  const buffer = Buffer.from(await audio.arrayBuffer());
  if (!hasAudioMagicBytes(buffer)) {
    return NextResponse.json({ error: "File does not look like an audio recording" }, { status: 400 });
  }

  const patientId = typeof patientIdRaw === "string" && patientIdRaw ? patientIdRaw : null;
  const language = languageRaw === "en" ? "en" : "pt";

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
      // Skips RECORDING/ENDED — the file already exists in full, so the
      // very first thing anyone would observe is "merging/uploading it".
      status: "MERGING",
      startedAt: new Date(),
      endedAt: new Date(),
    },
  });

  const ext = audio.name.split(".").pop()?.toLowerCase() || "webm";
  const key = `consultation-sessions/${session.id}/uploaded.${ext}`;

  try {
    await uploadToR2(key, buffer, audio.type || "application/octet-stream");
  } catch (e: any) {
    await prisma.ambientRecordingSession.update({
      where: { id: session.id },
      data: { status: "FAILED", error: `Upload failed: ${e?.message || e}` },
    });
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  await prisma.ambientRecordingSession.update({
    where: { id: session.id },
    data: { mergedAudioR2Key: key, status: "TRANSCRIBING" },
  });

  return NextResponse.json({ sessionId: session.id }, { status: 201 });
}
