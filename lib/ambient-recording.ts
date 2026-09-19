// Finalization pipeline for ambient (consultation) recording sessions
// (activity 64, T-4). Turns the chunk objects a live recording uploaded
// incrementally into a single merged audio file, ready for T-5 (AssemblyAI)
// to pick up.

import { prisma } from "@/lib/db";
import { listR2, getFromR2, uploadToR2 } from "@/lib/r2";
import { AI_STRICT_MODE } from "@/lib/claude";

const CHUNK_PREFIX = (sessionId: string) => `consultation-sessions/${sessionId}/`;
const CHUNK_KEY_RE = /chunk-(\d{5})\.webm$/;
const ASSEMBLYAI_BASE = "https://api.assemblyai.com/v2";

// A later failure (AI_STRICT_MODE, a revoked key, an AssemblyAI-reported
// error) must never silently erase an earlier, still-relevant note already
// sitting in `error` — specifically the missing-chunk gap note
// mergeSessionChunks writes, which needs to survive regardless of what
// happens to the session afterward.
function combineError(existing: string | null | undefined, next: string): string {
  return existing ? `${existing}\n${next}` : next;
}

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

// ============================================
// T-5 — AssemblyAI (diarized transcription)
// ============================================

/** Server-to-server upload — the merged audio never touches a public R2
 *  URL (see the T-4 comment above / plan.md Decisão 7); AssemblyAI gets its
 *  own private copy of the bytes directly. */
async function assemblyAIUploadAudio(buffer: Buffer, apiKey: string): Promise<string> {
  const res = await fetch(`${ASSEMBLYAI_BASE}/upload`, {
    method: "POST",
    headers: { authorization: apiKey },
    body: buffer,
  });
  if (!res.ok) throw new Error(`AssemblyAI upload failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data.upload_url as string;
}

/** Submits a session's merged audio for diarized transcription. Only sets
 *  `assemblyaiTranscriptId` on success — the polling side (below) is what
 *  actually resolves the session to TRANSCRIBED/FAILED. */
export async function submitToAssemblyAI(sessionId: string): Promise<void> {
  const session = await prisma.ambientRecordingSession.findUnique({ where: { id: sessionId } });
  if (!session || !session.mergedAudioR2Key) return;

  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  // AI_STRICT_MODE: same cautious treatment already applied to Groq/Gemini
  // for patient audio (see app/api/admin/clinical-scribe/transcribe/route.ts)
  // — fail explicitly instead of silently sending a patient recording to a
  // provider that hasn't been confirmed under strict mode (plan.md Suposição 1).
  if (AI_STRICT_MODE) {
    await prisma.ambientRecordingSession.update({
      where: { id: sessionId },
      data: { status: "FAILED", error: combineError(session.error, "AI_STRICT_MODE is on — AssemblyAI submission blocked for patient audio.") },
    });
    return;
  }
  if (!apiKey) {
    await prisma.ambientRecordingSession.update({
      where: { id: sessionId },
      data: { status: "FAILED", error: combineError(session.error, "ASSEMBLYAI_API_KEY is not configured.") },
    });
    return;
  }

  try {
    const buffer = await getFromR2(session.mergedAudioR2Key);
    const uploadUrl = await assemblyAIUploadAudio(buffer, apiKey);

    const res = await fetch(`${ASSEMBLYAI_BASE}/transcript`, {
      method: "POST",
      headers: { authorization: apiKey, "content-type": "application/json" },
      body: JSON.stringify({
        audio_url: uploadUrl,
        speaker_labels: true,
        language_code: session.language === "pt" ? "pt" : "en",
      }),
    });
    if (!res.ok) throw new Error(`AssemblyAI transcript submit failed (${res.status}): ${await res.text()}`);
    const data = await res.json();

    await prisma.ambientRecordingSession.update({
      where: { id: sessionId },
      data: { assemblyaiTranscriptId: data.id },
    });
  } catch (e: any) {
    await prisma.ambientRecordingSession.update({
      where: { id: sessionId },
      data: { status: "FAILED", error: combineError(session.error, `AssemblyAI submission failed: ${e?.message || e}`) },
    }).catch(() => {});
  }
}

// AssemblyAI only knows "Speaker A"/"Speaker B" — it has no idea which one
// is the therapist. Shown raw here on purpose (plan.md Suposição 6): T-6
// lets the therapist swap the labels before generating a SOAP note, which
// is slower but never silently wrong the way a "whoever talks first"
// heuristic would be.
function formatDiarizedTranscript(utterances: Array<{ speaker: string; text: string }>): string {
  return utterances.map((u) => `Speaker ${u.speaker}: ${u.text}`).join("\n");
}

/** Checks one submitted transcript's status and resolves the session when
 *  AssemblyAI is done (either way — completed or errored). Throws on a
 *  transient failure (network, non-2xx) so the caller can decide how to
 *  handle it without prematurely failing the session. */
export async function pollAssemblyAITranscript(sessionId: string): Promise<void> {
  const session = await prisma.ambientRecordingSession.findUnique({ where: { id: sessionId } });
  if (!session || !session.assemblyaiTranscriptId) return;

  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    await prisma.ambientRecordingSession.update({
      where: { id: sessionId },
      data: { status: "FAILED", error: combineError(session.error, "ASSEMBLYAI_API_KEY is not configured.") },
    });
    return;
  }

  const res = await fetch(`${ASSEMBLYAI_BASE}/transcript/${session.assemblyaiTranscriptId}`, {
    headers: { authorization: apiKey },
  });
  if (!res.ok) throw new Error(`AssemblyAI status check failed (${res.status})`);
  const data = await res.json();

  if (data.status === "completed") {
    const utterances = Array.isArray(data.utterances) ? data.utterances : [];
    const transcript = utterances.length > 0 ? formatDiarizedTranscript(utterances) : (data.text || "");
    await prisma.ambientRecordingSession.update({
      where: { id: sessionId },
      data: { transcript, status: "TRANSCRIBED" },
    });
  } else if (data.status === "error") {
    await prisma.ambientRecordingSession.update({
      where: { id: sessionId },
      data: { status: "FAILED", error: combineError(session.error, `AssemblyAI: ${data.error || "transcription failed"}`) },
    });
  }
  // else "queued"/"processing" — leave as-is, the background job polls again next tick.
}

/** Called from lib/background-jobs.ts on a timer. Two phases: submit
 *  merged-but-not-yet-submitted sessions, then poll already-submitted ones.
 *  Mirrors the claim/attempts pattern in lib/evidence-report.ts's job so a
 *  persistently failing submission can't loop forever, without needing a
 *  second table just to track it. */
export async function processAmbientTranscriptions(): Promise<void> {
  // Covers both phases — a session that fails repeatedly either submitting
  // or polling can't make progress either way. `attempts` only increments
  // on a genuine failure (network/API error), never on "still processing"
  // (see the toPoll loop below), so a long-but-healthy transcription is
  // never mistaken for a stuck one.
  await prisma.ambientRecordingSession.updateMany({
    where: { status: "TRANSCRIBING", attempts: { gte: 5 } },
    data: { status: "FAILED", error: "Transcription gave up after repeated failures." },
  });

  const staleBefore = new Date(Date.now() - 5 * 60 * 1000);
  const toSubmit = await prisma.ambientRecordingSession.findMany({
    where: {
      status: "TRANSCRIBING",
      mergedAudioR2Key: { not: null },
      assemblyaiTranscriptId: null,
      attempts: { lt: 5 },
      OR: [{ attempts: 0 }, { updatedAt: { lt: staleBefore } }],
    },
    orderBy: { createdAt: "asc" },
    take: 3,
    select: { id: true, attempts: true },
  });
  for (const r of toSubmit) {
    const claim = await prisma.ambientRecordingSession.updateMany({
      where: { id: r.id, status: "TRANSCRIBING", assemblyaiTranscriptId: null, attempts: r.attempts },
      data: { attempts: { increment: 1 } },
    });
    if (claim.count !== 1) continue; // someone else claimed it
    await submitToAssemblyAI(r.id);
  }

  const toPoll = await prisma.ambientRecordingSession.findMany({
    where: { status: "TRANSCRIBING", assemblyaiTranscriptId: { not: null }, attempts: { lt: 5 } },
    select: { id: true },
    take: 10,
  });
  for (const r of toPoll) {
    try {
      await pollAssemblyAITranscript(r.id);
    } catch (e: any) {
      console.error(`[ambient-recording] Poll failed for session ${r.id}:`, e?.message || e);
      // A genuine failure (bad transcript id, revoked key, AssemblyAI
      // outage) — count it. Without this, a persistently failing status
      // check left the session in TRANSCRIBING forever (found by QA): the
      // give-up cleanup above never ran because attempts never moved.
      // Guarded by status — an overlapping tick that already resolved this
      // session (TRANSCRIBED/FAILED) elsewhere must not have its `attempts`
      // bumped after the fact.
      await prisma.ambientRecordingSession.updateMany({
        where: { id: r.id, status: "TRANSCRIBING" },
        data: { attempts: { increment: 1 } },
      }).catch(() => {});
    }
  }
}
