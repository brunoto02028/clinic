import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffPatientAccess } from "@/lib/staff-patient-access";

export const dynamic = "force-dynamic";

type ActivityEvent = {
  id: string;
  type:
    | "LOGIN"
    | "EXERCISE_COMPLETED"
    | "VIDEO_WATCHED"
    | "MESSAGE_SENT"
    | "MESSAGE_RECEIVED"
    | "SCREENING_SUBMITTED"
    | "SCREENING_UPDATED"
    | "DOCUMENT_UPLOADED"
    | "CHECK_IN"
    /** Saiu para o paciente — e-mail, push, WhatsApp, o que for (104). */
    | "SEND_OUT"
    /** O portão barrou. Fica na linha do tempo de propósito: uma tela que só
     *  mostra o que saiu esconde justamente o que se quer auditar. */
    | "SEND_BLOCKED"
    /** Enfileirado, esperando alguém aprovar. */
    | "SEND_QUEUED"
    | "OTHER";
  title: string;
  description: string | null;
  at: string;
  /**
   * Quem apertou o gatilho. Separa as três naturezas que a mesma linha do
   * tempo mistura: o que a clínica disparou, o que o próprio paciente
   * provocou (código de acesso, confirmação de upload) e o que o sistema
   * mandou sozinho (alerta de crise de pressão).
   */
  origin?: "clinic" | "patient" | "system" | null;
};

// Any AuditLog action not listed here falls back to OTHER/the raw action
// instead of being silently mislabeled "Logged in" — the model is generic
// and explicitly meant to be reused for future patient-scoped actions
// (plan.md), so this list grows as new ones get written with userId = a
// patient (activity 49's reminder/follow-up sends, most recently).
const AUDIT_LABELS: Record<string, { type: ActivityEvent["type"]; title: string }> = {
  LOGIN_SUCCESS: { type: "LOGIN", title: "Logged in" },
  VIDEO_WATCHED: { type: "VIDEO_WATCHED", title: "Watched an exercise video" },
  DAILY_ADHERENCE_REMINDER_SENT: { type: "OTHER", title: "Sent: still time today reminder" },
  YESTERDAY_FOLLOWUP_SENT: { type: "OTHER", title: "Sent: yesterday follow-up" },
  ONBOARDING_REMINDER_SENT: { type: "OTHER", title: "Sent: onboarding reminder" },
  SOAP_NOTE_CREATED: { type: "OTHER", title: "SOAP note added" },
  PROTOCOL_ASSIGNED: { type: "OTHER", title: "Treatment protocol assigned" },
  EXERCISE_PRESCRIBED: { type: "OTHER", title: "Exercise prescribed" },
  WEEKLY_CLOSING_SENT_EN: { type: "OTHER", title: "Weekly closing sent (EN)" },
  WEEKLY_CLOSING_SENT_PT: { type: "OTHER", title: "Weekly closing sent (PT)" },
};

// Unifies five existing per-domain logs into one timeline — see
// specs/048-atividade-do-paciente/plan.md. No new table: only "video watched"
// (an AuditLog row, written by /api/patient/activity/video-watched) didn't
// already have a source to read from.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await staffPatientAccess(req, params.id);
  if (access.response) return access.response;

  const patientId = params.id;
  const rawLimit = req.nextUrl.searchParams.get("limit");
  const rawOffset = req.nextUrl.searchParams.get("offset");
  const limit = Math.min(Math.max(rawLimit !== null ? Number(rawLimit) : 50, 1), 100);
  const offset = Math.max(rawOffset !== null ? Number(rawOffset) : 0, 0);
  // +1 so a single source with more rows than the page still tips `hasMore`
  // into true — each source is sorted desc, so the item at merged position
  // `offset + limit` always ranks within the top (offset + limit + 1) of
  // whichever source it belongs to.
  const take = offset + limit + 1;

  const [
    auditLogs, completionLogs, messages, screening, documents, checkIns,
    emailsEnviados, decisoesDoPortao, naFila,
  ] = await Promise.all([
    prisma.auditLog.findMany({
      where: { userId: patientId },
      orderBy: { createdAt: "desc" },
      take,
    }),
    prisma.exerciseCompletionLog.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        protocolItem: { select: { title: true } },
        exercisePrescription: { select: { exercise: { select: { name: true } } } },
      },
    }),
    prisma.clinicMessage.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, senderRole: true, title: true, content: true, createdAt: true },
    }),
    prisma.medicalScreening.findUnique({
      where: { userId: patientId },
      select: { createdAt: true, updatedAt: true },
    }),
    prisma.patientDocument.findMany({
      where: { patientId, uploadedById: patientId },
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, fileName: true, createdAt: true },
    }),
    // The check-in was missing from this feed, which is the screen a therapist
    // opens to see whether the patient has been showing up (found by the
    // parity audit). A patient checking in every day looked inactive here.
    (prisma as any).dailyCheckIn.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true, checkinDate: true, painLevel: true, moodLevel: true,
        exercisesDone: true, notes: true, createdAt: true,
      },
    }),
    // ── As três fontes de envio (104) ──
    // O que de facto saiu, pelo compositor de e-mail.
    prisma.patientOutboundEmail.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true, subject: true, status: true, locale: true, bothLanguages: true,
        providerError: true, bodyText: true, createdAt: true,
        sentBy: { select: { firstName: true, lastName: true } },
      },
    }),
    // O veredito do portão, inclusive o de barrar.
    prisma.systemLog.findMany({
      where: { source: "patient-send-gate", userId: patientId },
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, message: true, path: true, details: true, createdAt: true },
    }),
    // O que espera aprovação.
    prisma.outboundMessage.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, subjectEn: true, status: true, channel: true, createdAt: true },
    }),
  ]);

  const events: ActivityEvent[] = [];

  for (const log of auditLogs) {
    const labeled = AUDIT_LABELS[log.action] || { type: "OTHER" as const, title: log.action };
    events.push({
      id: log.id,
      type: labeled.type,
      title: labeled.title,
      description: log.description,
      at: log.createdAt.toISOString(),
    });
  }

  for (const c of checkIns as any[]) {
    events.push({
      id: c.id,
      type: "CHECK_IN",
      title: `Check-in: pain ${c.painLevel}/10, mood ${c.moodLevel}/5`,
      // What they wrote, when they wrote something — it is the part a
      // therapist actually reads.
      description: c.notes || (c.exercisesDone ? "Did the exercises" : null),
      at: c.createdAt.toISOString(),
    });
  }

  for (const log of completionLogs) {
    const exerciseName = log.protocolItem?.title || log.exercisePrescription?.exercise?.name || "an exercise";
    events.push({
      id: log.id,
      type: "EXERCISE_COMPLETED",
      title: `Completed "${exerciseName}"`,
      description: null,
      at: log.createdAt.toISOString(),
    });
  }

  for (const msg of messages) {
    const isFromPatient = msg.senderRole === "patient";
    events.push({
      id: msg.id,
      type: isFromPatient ? "MESSAGE_SENT" : "MESSAGE_RECEIVED",
      title: isFromPatient ? "Sent a message" : "Received a message",
      description: msg.title || msg.content.slice(0, 140),
      at: msg.createdAt.toISOString(),
    });
  }

  if (screening) {
    const updated = screening.updatedAt.getTime() !== screening.createdAt.getTime();
    events.push({
      id: `screening-${patientId}`,
      type: updated ? "SCREENING_UPDATED" : "SCREENING_SUBMITTED",
      title: updated ? "Updated medical screening" : "Submitted medical screening",
      description: null,
      at: screening.updatedAt.toISOString(),
    });
  }

  for (const doc of documents) {
    events.push({
      id: doc.id,
      type: "DOCUMENT_UPLOADED",
      title: `Uploaded "${doc.fileName}"`,
      description: null,
      at: doc.createdAt.toISOString(),
    });
  }

  for (const e of emailsEnviados) {
    const quem = e.sentBy ? `${e.sentBy.firstName} ${e.sentBy.lastName}` : "the clinic";
    events.push({
      id: e.id,
      type: "SEND_OUT",
      title: e.status === "sent" ? `E-mail sent: "${e.subject}"` : `E-mail FAILED: "${e.subject}"`,
      description: [
        `by ${quem}`,
        e.bothLanguages ? "EN + PT" : e.locale,
        e.providerError || null,
        e.bodyText?.slice(0, 160) || null,
      ].filter(Boolean).join(" · "),
      at: e.createdAt.toISOString(),
      origin: "clinic",
    });
  }

  for (const d of decisoesDoPortao) {
    const barrado = d.message.startsWith("barrado");
    const det = (d.details || {}) as any;
    const modo = det?.modo;
    // O transacional é resposta ao que o próprio paciente acabou de fazer.
    const origem = modo === "transacional" ? "patient" : "clinic";
    events.push({
      id: d.id,
      type: barrado ? "SEND_BLOCKED" : "SEND_OUT",
      title: barrado
        ? `Not sent (${d.message.replace("barrado:", "")}) — ${det?.canal || "message"}`
        : `Allowed to send — ${det?.canal || "message"}`,
      description: d.path || null,
      at: d.createdAt.toISOString(),
      origin: origem,
    });
  }

  for (const m of naFila) {
    events.push({
      id: m.id,
      type: "SEND_QUEUED",
      title: `Queued (${m.status}): "${m.subjectEn}"`,
      description: m.channel,
      at: m.createdAt.toISOString(),
      origin: "clinic",
    });
  }

  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const totalFetched = events.length;
  const page = events.slice(offset, offset + limit);
  const hasMore = totalFetched > offset + limit;

  return NextResponse.json({ events: page, hasMore });
}
