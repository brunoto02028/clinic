import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOnboardingPending, ONBOARDING_REMINDER_ACTION } from "@/lib/onboarding-reminder";
import { notifyPatient } from "@/lib/notify-patient";
import { logAudit } from "@/lib/system-logger";

export const dynamic = "force-dynamic";

// POST /api/cron/onboarding-reminder — runs daily (same schedule as
// daily-adherence), but only actually reminds a patient once every 2 days:
// the dedupe window here is 48h, not "today", so a daily check still lands
// on a 2-day cadence. Call via cron: curl -X POST
// https://bpr.clinic/api/cron/onboarding-reminder?key=SECRET
export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
  if (key !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const clinics = await prisma.clinic.findMany({ where: { isActive: true }, select: { id: true, name: true } });
  const results: { clinicId: string; checked: number; remindersSent: number }[] = [];

  for (const clinic of clinics) {
    const patients = await prisma.user.findMany({
      where: { clinicId: clinic.id, role: "PATIENT", isActive: true },
      select: { id: true, firstName: true, lastName: true },
    });

    let remindersSent = 0;
    for (const patient of patients) {
      const pending = await getOnboardingPending(patient.id);
      if (!pending.anyPending) continue;

      const already = await prisma.auditLog.findFirst({
        where: { userId: patient.id, action: ONBOARDING_REMINDER_ACTION, createdAt: { gte: twoDaysAgo } },
        select: { id: true },
      });
      if (already) continue;

      await notifyPatient({
        patientId: patient.id,
        plainMessage: "",
        onboardingPending: pending,
      });
      await logAudit({
        userId: patient.id,
        userEmail: "",
        userRole: "PATIENT",
        action: ONBOARDING_REMINDER_ACTION,
        entity: "User",
        entityId: patient.id,
        description: `Onboarding reminder sent to ${patient.firstName} ${patient.lastName}`,
      });
      remindersSent++;
    }

    results.push({ clinicId: clinic.id, checked: patients.length, remindersSent });
  }

  return NextResponse.json({ results });
}
