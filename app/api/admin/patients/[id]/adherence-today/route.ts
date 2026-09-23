import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import { getExpectedToday } from "@/lib/patient-daily-adherence";
import { REMINDER_ACTION, YESTERDAY_ACTION } from "@/lib/daily-adherence-email";

export const dynamic = "force-dynamic";

// GET — one patient's today's-plan status plus yesterday's, for the
// adherence panel on their own profile page. Same source as the
// clinic-wide card/e-mail (activity 49), just scoped to a single patient.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await staffPatientAccess(req, params.id);
  if (access.response) return access.response;

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const [today, prevDay, todaySent, yesterdaySent, queuedToday] = await Promise.all([
    getExpectedToday(params.id, now),
    getExpectedToday(params.id, yesterday),
    // "Already sent" has to use the same dedupe window the send routes do
    // (today, not the last 24h) — otherwise the panel could show "Sent"
    // right up to the moment a fresh reminder is actually allowed to go out.
    prisma.auditLog.findFirst({
      where: { userId: params.id, action: REMINDER_ACTION, createdAt: { gte: dayStart } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.auditLog.findFirst({
      where: { userId: params.id, action: YESTERDAY_ACTION, createdAt: { gte: dayStart } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    // A reminder waiting for approval is neither "sent" nor "nothing happened"
    // (activity 072, T-7). Saying "not sent" here is what let someone press
    // Send now and give the patient two.
    prisma.outboundMessage.findFirst({
      where: {
        patientId: params.id,
        ruleCode: "ADHERENCE_DAILY_REMINDER",
        status: { in: ["AWAITING_APPROVAL", "APPROVED"] },
        createdAt: { gte: dayStart },
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, status: true },
    }),
  ]);
  const missingToday = today.expected.filter((e) => !today.completed.some((c) => c.id === e.id));
  const missingYesterday = prevDay.expected.filter((e) => !prevDay.completed.some((c) => c.id === e.id));

  return NextResponse.json({
    hasPlan: today.expected.length > 0,
    allDone: today.allDone,
    missing: missingToday,
    reminderSentAt: todaySent?.createdAt.toISOString() || null,
    /** Queued by an automation and waiting for someone to approve it. */
    reminderQueuedAt: queuedToday?.createdAt.toISOString() || null,
    yesterday: {
      hasPlan: prevDay.expected.length > 0,
      allDone: prevDay.allDone,
      missing: missingYesterday,
      reminderSentAt: yesterdaySent?.createdAt.toISOString() || null,
    },
  });
}
