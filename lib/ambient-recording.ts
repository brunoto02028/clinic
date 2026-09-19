// Finalization pipeline for ambient (consultation) recording sessions
// (activity 64, T-4). Turns the chunk objects a live recording uploaded
// incrementally into a single merged audio file, ready for T-5 (AssemblyAI)
// to pick up.

import { prisma } from "@/lib/db";
import { listR2, getFromR2, uploadToR2 } from "@/lib/r2";

const CHUNK_PREFIX = (sessionId: string) => `consultation-sessions/${sessionId}/`;
const CHUNK_KEY_RE = /chunk-(\d{5})\.webm$/;

/** Concatenates a session's chunk objects, in order, into one merged audio
 *  file. Webm/opus chunks produced by a single continuous MediaRecorder
 *  timeslice sequence are binary-concatenable — this is not true of webm
 *  in general, only of successive `ondataavailable` outputs from the same
 *  recorder instance, which is all this ever merges. */
export async function mergeSessionChunks(sessionId: string): Promise<void> {
  const session = await prisma.ambientRecordingSession.findUnique({ where: { id: sessionId } });
  if (!session) return;

  try {
    await prisma.ambientRecordingSession.update({
      where: { id: sessionId },
      data: { status: "MERGING" },
    });

    const keys = (await listR2(CHUNK_PREFIX(sessionId)))
      .map((key) => {
        const match = key.match(CHUNK_KEY_RE);
        return match ? { key, index: Number(match[1]) } : null;
      })
      .filter((x): x is { key: string; index: number } => x !== null)
      .sort((a, b) => a.index - b.index);

    if (keys.length === 0) {
      await prisma.ambientRecordingSession.update({
        where: { id: sessionId },
        data: { status: "FAILED", error: "No chunks were ever saved for this session." },
      });
      return;
    }

    // A chunk that permanently failed to upload (client gave up after
    // retries — see AmbientScribe's uploadChunk) leaves a gap in the index
    // sequence. The merge still succeeds with what's there — an audible gap
    // beats losing the whole consultation — but this must not be silent:
    // `error` doubles as a non-fatal note here, surfaced in T-6's UI
    // regardless of status, not just when status is FAILED.
    const missing: number[] = [];
    for (let i = keys[0].index; i < keys[keys.length - 1].index; i++) {
      if (!keys.some((k) => k.index === i)) missing.push(i);
    }
    const gapNote = missing.length > 0
      ? `Recording has ${missing.length} missing chunk(s) (index ${missing.join(", ")}) — some audio may be missing from a gap during recording.`
      : null;

    const buffers = await Promise.all(keys.map(({ key }) => getFromR2(key)));
    const merged = Buffer.concat(buffers);
    const mergedKey = `${CHUNK_PREFIX(sessionId)}merged.webm`;
    await uploadToR2(mergedKey, merged, "audio/webm");

    // Wall-clock elapsed time is a far better duration estimate than
    // chunkCount * timeslice (the last chunk is rarely a full 30s).
    const durationSeconds = session.endedAt
      ? Math.max(0, Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 1000))
      : null;

    await prisma.ambientRecordingSession.update({
      where: { id: sessionId },
      data: {
        mergedAudioR2Key: mergedKey,
        durationSeconds,
        error: gapNote,
        // T-5 (AssemblyAI submission) isn't built yet — this is the correct
        // resting state for a session with audio ready and no transcript
        // pipeline to hand it to yet.
        status: "TRANSCRIBING",
      },
    });
  } catch (e: any) {
    await prisma.ambientRecordingSession.update({
      where: { id: sessionId },
      data: { status: "FAILED", error: `Merge failed: ${e?.message || e}` },
    }).catch(() => {});
  }
}
