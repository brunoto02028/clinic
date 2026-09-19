import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import { notifyPatient } from "@/lib/notify-patient";
import { logAudit } from "@/lib/system-logger";
import {
  buildWeeklyClosingText,
  startOfWeek,
  WEEKLY_CLOSING_TITLE_EN,
  WEEKLY_CLOSING_TITLE_PT,
  WEEKLY_CLOSING_ACTION_EN,
  WEEKLY_CLOSING_ACTION_PT,
} from "@/lib/weekly-closing";

export const dynamic = "force-dynamic";

// GET — has this patient's weekly closing already gone out this week, per
// language? Each language tracked independently (activity 60 — the admin can
// send EN and, separately, PT the same week).
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await staffPatientAccess(req, params.id);
  if (access.response) return access.response;

  const weekStart = startOfWeek(new Date());
  const [en, pt] = await Promise.all([
    prisma.auditLog.findFirst({
      where: { userId: params.id, action: WEEKLY_CLOSING_ACTION_EN, createdAt: { gte: weekStart } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.auditLog.findFirst({
      where: { userId: params.id, action: WEEKLY_CLOSING_ACTION_PT, createdAt: { gte: weekStart } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  return NextResponse.json({
    en: { sentAt: en?.createdAt.toISOString() || null },
    pt: { sentAt: pt?.createdAt.toISOString() || null },
  });
}

// POST — sends the weekly closing note. Creates a real ClinicMessage (shows
// up in the patient's Messages tab, where their explanation for anything
// they couldn't do belongs) plus a short notifyPatient ping pointing them
// there — same two-step pattern as the general staff-message route
// (app/api/admin/patients/[id]/messages), just with fixed, pre-approved
// copy instead of free text.
//
// `plainMessage` below is deliberately the ONLY language field passed to
// notifyPatient — plainMessagePt is left unset. notifyPatient will otherwise
// pick PT for a patient whose preferredLocale is pt-BR regardless of which
// language button the therapist clicked; leaving plainMessagePt empty makes
// the therapist's explicit choice win every time.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await staffPatientAccess(req, params.id);
  if (access.response) return access.response;

  const { locale } = await req.json().catch(() => ({}));
  if (locale !== "en" && locale !== "pt") {
    return NextResponse.json({ error: "locale must be 'en' or 'pt'" }, { status: 400 });
  }

  const patient = await prisma.user.findUnique({
    where: { id: params.id },
    select: { firstName: true, lastName: true },
  });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const sender = await prisma.user.findUnique({
    where: { id: access.actor.userId },
    select: { firstName: true, lastName: true },
  });

  const text = buildWeeklyClosingText(patient.firstName || "", locale);
  const title = locale === "pt" ? WEEKLY_CLOSING_TITLE_PT : WEEKLY_CLOSING_TITLE_EN;
  const action = locale === "pt" ? WEEKLY_CLOSING_ACTION_PT : WEEKLY_CLOSING_ACTION_EN;

  await (prisma as any).clinicMessage.create({
    data: {
      patientId: params.id,
      senderId: access.actor.userId,
      senderRole: "staff",
      kind: "notice",
      title,
      content: text,
    },
  });

  const appUrl = process.env.NEXTAUTH_URL || "https://bpr.clinic";
  await notifyPatient({
    patientId: params.id,
    plainMessage: `New message from your clinic: "${title}" — read and reply in your portal: ${appUrl}/dashboard/questions`,
  });

  await logAudit({
    userId: params.id,
    userEmail: "",
    userRole: "PATIENT",
    action,
    entity: "User",
    entityId: params.id,
    description: `Weekly closing (${locale.toUpperCase()}) sent by ${sender ? `${sender.firstName} ${sender.lastName}` : access.actor.userId}`,
  });

  return NextResponse.json({ sent: true, sentAt: new Date().toISOString() });
}
