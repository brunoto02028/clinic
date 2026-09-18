import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSuperadminActor } from "@/lib/tenant-access";
import { getLevelForXP, XP_REWARDS, getBadgeDef } from "@/lib/journey";

export const dynamic = "force-dynamic";

/**
 * POST /api/notifications/trigger — Trigger smart notifications for patients
 * Can be called by cron job or admin action
 * body: { type: "streak_check" | "stagnation_check" | "challenge_reminder" | "generate_missions" }
 */
export async function POST(req: NextRequest) {
  try {
    // These sweeps run over every patient on the platform, so only a cron with
    // the configured secret or the platform owner may start one (activity 52,
    // T-10). There's no default secret: a known fallback ("bpr-cron-secret")
    // was as good as none, and no scheduled task calls this route.
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const byCron = !!cronSecret && authHeader === `Bearer ${cronSecret}`;
    if (!byCron && !(await getSuperadminActor(req))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type } = await req.json();
    const results: string[] = [];

    switch (type) {
      case "streak_check": {
        // Check all patients for streak status
        const allProgress = await (prisma as any).patientProgress.findMany({
          include: { patient: { select: { id: true, firstName: true } } },
        });

        for (const p of allProgress) {
          if (!p.lastActiveDate) continue;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const lastActive = new Date(p.lastActiveDate);
          lastActive.setHours(0, 0, 0, 0);
          const diffDays = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

          // Streak of 3 days notification
          if (p.streakDays === 3) {
            await createNotificationIfNotExists(p.patientId, p.clinicId, "streak",
              "🔥 3 days in a row!",
              `${p.patient.firstName || "You"}, you're on fire! 3 consecutive days of activity. Keep going!`,
              "/dashboard/journey",
              "🔥 3 dias seguidos!",
              `${p.patient.firstName || "Você"}, você está arrasando! 3 dias consecutivos de atividade. Continue assim!`
            );
            results.push(`Streak 3 notification for ${p.patientId}`);
          }

          // Streak broken notification
          if (diffDays === 2 && p.streakDays > 0) {
            await createNotificationIfNotExists(p.patientId, p.clinicId, "reminder",
              "We miss you! 😊",
              `Hey ${p.patient.firstName || "there"}, we noticed you haven't been active. Your mission for today is waiting!`,
              "/dashboard/journey",
              "Sentimos sua falta! 😊",
              `Olá ${p.patient.firstName || ""}, notamos que você não esteve ativo. Sua missão de hoje está esperando!`
            );
            results.push(`Streak broken reminder for ${p.patientId}`);
          }
        }
        break;
      }

      case "stagnation_check": {
        // Check body assessment stagnation
        const patients = await prisma.user.findMany({
          where: { role: "PATIENT" as any },
          select: { id: true, firstName: true, clinicId: true },
        });

        for (const patient of patients) {
          const assessments = await (prisma as any).bodyAssessment.findMany({
            where: { patientId: patient.id, status: "COMPLETED" },
            orderBy: { createdAt: "desc" },
            take: 3,
            select: { overallScore: true },
          });

          if (assessments.length >= 2) {
            const scores = assessments.map((a: any) => a.overallScore || 0);
            const avg = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
            const variance = scores.reduce((sum: number, s: number) => sum + Math.abs(s - avg), 0) / scores.length;

            if (variance < 3) {
              await createNotificationIfNotExists(patient.id, patient.clinicId, "stagnation",
                "⚠️ Your progress has stalled",
                `${patient.firstName || "Hi"}, your recovery scores have plateaued. We have a solution — book a special session with 15% OFF!`,
                "/dashboard/plans",
                "⚠️ Seu progresso estagnou",
                `${patient.firstName || "Olá"}, suas pontuações de recuperação estabilizaram. Temos uma solução — agende uma sessão especial com 15% OFF!`
              );
              results.push(`Stagnation alert for ${patient.id}`);
            }
          }
        }
        break;
      }

      case "challenge_reminder": {
        // Remind about active challenges nearing completion
        const now = new Date();
        const challenges = await (prisma as any).weeklyChallenge.findMany({
          where: { isActive: true, endsAt: { gte: now }, completedAt: null },
        });

        for (const challenge of challenges) {
          const remaining = challenge.target - challenge.current;
          const percentComplete = (challenge.current / challenge.target) * 100;

          if (percentComplete >= 70 && percentComplete < 100) {
            // Notify all patients in this clinic
            const patients = await prisma.user.findMany({
              where: { role: "PATIENT" as any, ...(challenge.clinicId ? { clinicId: challenge.clinicId } : {}) },
              select: { id: true },
            });

            for (const patient of patients) {
              await createNotificationIfNotExists(patient.id, challenge.clinicId, "challenge",
                `🏆 Almost there! ${remaining} to go!`,
                `The weekly challenge "${challenge.title}" is ${Math.round(percentComplete)}% complete. Contribute now!`,
                "/dashboard/community",
                `🏆 Quase lá! Faltam ${remaining}!`,
                `O desafio semanal "${challenge.title}" está ${Math.round(percentComplete)}% concluído. Contribua agora!`
              );
            }
            results.push(`Challenge reminder for ${challenge.id}`);
          }
        }
        break;
      }

      case "generate_missions": {
        // Generate weekly missions for all active patients
        const weekStart = getWeekStart();
        const patients = await prisma.user.findMany({
          where: { role: "PATIENT" as any, isActive: true },
          select: { id: true, clinicId: true },
        });

        for (const patient of patients) {
          // Check if missions already exist for this week
          const existing = await (prisma as any).dailyMission.findFirst({
            where: { patientId: patient.id, weekStart },
          });
          if (existing) continue;

          // Create standard mission
          await (prisma as any).dailyMission.create({
            data: {
              patientId: patient.id,
              clinicId: patient.clinicId,
              weekStart,
              xpReward: 50,
              tasks: [
                { key: "complete_exercises", label: "Complete 2 exercises from Treatment Plan", labelPt: "Complete 2 exercícios do Plano de Tratamento", completed: false, xp: 20 },
                { key: "pain_checkin", label: "Do a pain check-in", labelPt: "Faça um check-in de dor", completed: false, xp: 15 },
                { key: "read_article", label: "Read 1 educational article", labelPt: "Leia 1 artigo educativo", completed: false, xp: 10 },
              ],
            },
          });

          // Check if patient level >= 5 for bonus mission
          const progress = await (prisma as any).patientProgress.findUnique({ where: { patientId: patient.id } });
          if (progress && progress.level >= 5) {
            await (prisma as any).dailyMission.create({
              data: {
                patientId: patient.id,
                clinicId: patient.clinicId,
                weekStart,
                xpReward: 100,
                isBonusMission: true,
                tasks: [
                  { key: "body_assessment", label: "Complete a body assessment", labelPt: "Complete uma avaliação corporal", completed: false, xp: 25 },
                  { key: "community_high_five", label: "Give 3 high fives in the community", labelPt: "Dê 3 high fives na comunidade", completed: false, xp: 10 },
                  { key: "share_victory", label: "Share a victory in the community", labelPt: "Compartilhe uma vitória na comunidade", completed: false, xp: 15 },
                ],
              },
            });
          }

          results.push(`Missions generated for ${patient.id}`);
        }
        break;
      }

      default:
        return NextResponse.json({ error: "Unknown trigger type" }, { status: 400 });
    }

    return NextResponse.json({ success: true, results, count: results.length });
  } catch (err: any) {
    console.error("[notifications/trigger] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(now.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

async function createNotificationIfNotExists(
  patientId: string,
  clinicId: string | null,
  type: string,
  titleEn: string,
  messageEn: string,
  actionUrl: string,
  titlePt?: string,
  messagePt?: string,
) {
  // Check if similar notification already sent today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const existing = await (prisma as any).journeyNotification.findFirst({
    where: {
      patientId,
      type,
      createdAt: { gte: today },
    },
  });
  if (existing) return;

  // Resolve patient locale
  let isPt = false;
  try {
    const user = await prisma.user.findUnique({ where: { id: patientId }, select: { preferredLocale: true } as any });
    isPt = ((user as any)?.preferredLocale || 'en-GB').startsWith('pt');
  } catch {}

  const title = (isPt && titlePt) ? titlePt : titleEn;
  const message = (isPt && messagePt) ? messagePt : messageEn;

  await (prisma as any).journeyNotification.create({
    data: { patientId, clinicId, type, title, message, actionUrl },
  });
}
