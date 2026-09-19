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
    | "OTHER";
  title: string;
  description: string | null;
  at: string;
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

  const [auditLogs, completionLogs, messages, screening, documents] = await Promise.all([
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

  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const totalFetched = events.length;
  const page = events.slice(offset, offset + limit);
  const hasMore = totalFetched > offset + limit;

  return NextResponse.json({ events: page, hasMore });
}
