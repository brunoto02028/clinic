export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notifyPatient } from "@/lib/notify-patient";

// POST /api/cron/appointment-reminders — Send reminders 24h before appointments
// Call via cron: curl -X POST https://bpr.rehab/api/cron/appointment-reminders?key=SECRET
export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
  if (key !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000);

    // Find appointments happening in the next 23-25 hours that haven't been reminded
    const appointments = await (prisma as any).appointment.findMany({
      where: {
        dateTime: { gte: in23h, lte: in24h },
        status: { in: ["SCHEDULED", "CONFIRMED"] },
        reminderSent: { not: true },
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
        therapist: { select: { firstName: true, lastName: true } },
      },
    });

    let sent = 0;
    let failed = 0;

    for (const appt of appointments as any[]) {
      try {
        const apptDate = new Date(appt.dateTime);
        const dateStr = apptDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        const timeStr = apptDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
        const BASE = process.env.NEXTAUTH_URL || "https://bpr.rehab";

        await notifyPatient({
          patientId: appt.patient.id,
          emailTemplateSlug: "APPOINTMENT_REMINDER",
          emailVars: {
            patientName: `${appt.patient.firstName} ${appt.patient.lastName}`,
            appointmentDate: dateStr,
            appointmentTime: timeStr,
            therapistName: `${appt.therapist.firstName} ${appt.therapist.lastName}`,
            treatmentType: appt.treatmentType || "",
            duration: String(appt.duration || 60),
            portalUrl: `${BASE}/dashboard/appointments`,
          },
          plainMessage: `Reminder: Your appointment is tomorrow ${dateStr} at ${timeStr} with ${appt.therapist.firstName}. Duration: ${appt.duration || 60} min.`,
        });

        // Mark as reminded
        await (prisma as any).appointment.update({
          where: { id: appt.id },
          data: { reminderSent: true },
        });
        sent++;
      } catch (err) {
        console.error(`[appointment-reminders] Failed for appt ${appt.id}:`, err);
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      found: appointments.length,
      sent,
      failed,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[appointment-reminders] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
