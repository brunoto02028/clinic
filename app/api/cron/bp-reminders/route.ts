import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendTemplatedEmail } from "@/lib/email-templates";
import { notifyPatient } from "@/lib/notify-patient";

// POST /api/cron/bp-reminders — Send weekly BP reminder emails
// Call this via cron job: curl -X POST https://domain/api/cron/bp-reminders?key=SECRET
export async function POST(request: NextRequest) {
  // Simple API key protection
  const key = request.nextUrl.searchParams.get("key");
  const expectedKey = process.env.CRON_SECRET || "bp-cron-secret";
  if (key !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find all patients with BP reminders enabled
    const patients = await prisma.user.findMany({
      where: {
        bpReminderEnabled: true,
        role: "PATIENT",
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        bloodPressureReadings: {
          orderBy: { measuredAt: "desc" },
          take: 1,
          select: { measuredAt: true },
        },
      },
    });

    let sent = 0;
    let skipped = 0;

    for (const patient of patients) {
      // Skip if they measured in the last 5 days
      const lastReading = patient.bloodPressureReadings[0];
      if (lastReading) {
        const daysSince = (Date.now() - new Date(lastReading.measuredAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 5) {
          skipped++;
          continue;
        }
      }

      // Send reminder via patient's preferred channel
      try {
        const BASE = process.env.NEXTAUTH_URL || 'https://bpr.rehab';
        await notifyPatient({
          patientId: patient.id,
          emailTemplateSlug: 'EXERCISE_REMINDER',
          emailVars: {
            protocolTitle: 'Blood Pressure Monitoring',
            exerciseCount: '1',
            exerciseList: 'Weekly BP reading',
            portalUrl: `${BASE}/dashboard/blood-pressure`,
          },
          plainMessage: 'Time to check your blood pressure! Log your reading in your patient portal.',
          plainMessagePt: 'Hora de verificar sua pressão arterial! Registre sua leitura no portal do paciente.',
        });
        sent++;
      } catch (err) {
        console.error(`Failed to send BP reminder to ${patient.email}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      total: patients.length,
      sent,
      skipped,
    });
  } catch (error) {
    console.error("BP reminder cron error:", error);
    return NextResponse.json({ error: "Failed to send reminders" }, { status: 500 });
  }
}
