import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import { getExpectedToday } from "@/lib/patient-daily-adherence";
import { notifyPatient } from "@/lib/notify-patient";
import { logAudit } from "@/lib/system-logger";
import { YESTERDAY_ACTION } from "@/lib/daily-adherence-email";

export const dynamic = "force-dynamic";

// POST — manual "send now" for one patient's yesterday follow-up. Same
// dedupe pattern as send-reminder (one AuditLog row per patient per day),
// under its own action so it never collides with the "still time today"
// reminder's dedupe.
export async function POST(req: NextRequest) {
  const { patientId, locale } = await req.json().catch(() => ({}));
  if (!patientId) return NextResponse.json({ error: "patientId is required" }, { status: 400 });
  if (locale !== undefined && locale !== "en" && locale !== "pt") {
    return NextResponse.json({ error: "locale must be 'en' or 'pt'" }, { status: 400 });
  }

  const access = await staffPatientAccess(req, patientId);
  if (access.response) return access.response;

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const already = await prisma.auditLog.findFirst({
    where: { userId: patientId, action: YESTERDAY_ACTION, createdAt: { gte: dayStart } },
    select: { id: true },
  });
  if (already) return NextResponse.json({ sent: false, reason: "already_sent_today" });

  const patient = await prisma.user.findUnique({ where: { id: patientId }, select: { firstName: true, lastName: true } });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const { expected, completed } = await getExpectedToday(patientId, yesterday);
  const missing = expected.filter((e) => !completed.some((c) => c.id === e.id)).map((e) => e.title);
  if (missing.length === 0) return NextResponse.json({ sent: false, reason: "nothing_missing_yesterday" });

  const result = await notifyPatient({
    patientId,
    plainMessage: "",
    yesterdayMissingTitles: missing,
    forceLocale: locale,
  });
  await logAudit({
    userId: patientId,
    userEmail: "",
    userRole: "PATIENT",
    action: YESTERDAY_ACTION,
    entity: "User",
    entityId: patientId,
    description: `Yesterday follow-up sent to ${patient.firstName} ${patient.lastName} (${missing.length} missed)`,
  });

  return NextResponse.json({ sent: result.success, channel: result.channel });
}
