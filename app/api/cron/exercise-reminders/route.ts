export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notifyPatient } from "@/lib/notify-patient";

// POST /api/cron/exercise-reminders — Send exercise reminders to patients with active protocols
// Call via cron: curl -X POST https://bpr.rehab/api/cron/exercise-reminders?key=SECRET
export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
  if (key !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find patients with active treatment protocols that have home exercises
    const protocols = await (prisma as any).treatmentProtocol.findMany({
      where: {
        status: { in: ["ACTIVE", "IN_PROGRESS"] },
        items: {
          some: {
            type: { in: ["HOME_EXERCISE", "HOME_CARE"] },
            isCompleted: false,
          },
        },
      },
      select: {
        id: true,
        title: true,
        patientId: true,
        patient: { select: { id: true, firstName: true } },
        items: {
          where: { type: { in: ["HOME_EXERCISE", "HOME_CARE"] }, isCompleted: false },
          select: { id: true, title: true },
          take: 3,
        },
      },
    });

    let sent = 0;
    let failed = 0;
    const BASE = process.env.NEXTAUTH_URL || "https://bpr.rehab";

    for (const protocol of protocols) {
      if (!protocol.patientId) continue;
      try {
        const exerciseNames = protocol.items.map((i: any) => i.title).join(", ");
        const count = protocol.items.length;

        await notifyPatient({
          patientId: protocol.patientId,
          emailTemplateSlug: "EXERCISE_REMINDER",
          emailVars: {
            protocolTitle: protocol.title || "Treatment Plan",
            exerciseCount: String(count),
            exerciseList: exerciseNames,
            portalUrl: `${BASE}/dashboard/treatment`,
          },
          plainMessage: `Time for your exercises! You have ${count} pending exercise(s): ${exerciseNames}. Log in to your portal to track your progress.`,
          plainMessagePt: `Hora dos exercícios! Você tem ${count} exercício(s) pendente(s): ${exerciseNames}. Acesse seu portal para acompanhar seu progresso.`,
        });
        sent++;
      } catch (err) {
        console.error(`[exercise-reminders] Failed for patient ${protocol.patientId}:`, err);
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      found: protocols.length,
      sent,
      failed,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[exercise-reminders] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
