import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { callAI } from "@/lib/ai-provider";

export const dynamic = "force-dynamic";

// ─── Retention Score Calculation ───
// 0-100 score based on multiple engagement signals
function calculateRetentionScore(patient: any): {
  score: number;
  factors: { key: string; label: string; value: number; weight: number; contribution: number }[];
  risk: "low" | "medium" | "high" | "critical";
} {
  const now = new Date();
  const factors: { key: string; label: string; value: number; weight: number; contribution: number }[] = [];

  // 1. Recency — days since last active (weight: 30)
  const lastActive = patient.lastActiveDate ? new Date(patient.lastActiveDate) : null;
  const daysSinceActive = lastActive ? Math.floor((now.getTime() - lastActive.getTime()) / 86400000) : 999;
  const recencyScore = daysSinceActive <= 1 ? 100 : daysSinceActive <= 3 ? 85 : daysSinceActive <= 7 ? 65 : daysSinceActive <= 14 ? 40 : daysSinceActive <= 30 ? 20 : 0;
  factors.push({ key: "recency", label: "Last Active", value: daysSinceActive, weight: 30, contribution: recencyScore * 0.30 });

  // 2. Streak consistency (weight: 20)
  const streakScore = patient.streakDays >= 14 ? 100 : patient.streakDays >= 7 ? 80 : patient.streakDays >= 3 ? 55 : patient.streakDays >= 1 ? 30 : 0;
  factors.push({ key: "streak", label: "Current Streak", value: patient.streakDays, weight: 20, contribution: streakScore * 0.20 });

  // 3. Level progression (weight: 15)
  const levelScore = patient.level >= 10 ? 100 : patient.level >= 5 ? 75 : patient.level >= 3 ? 50 : patient.level >= 2 ? 30 : 10;
  factors.push({ key: "level", label: "Level", value: patient.level, weight: 15, contribution: levelScore * 0.15 });

  // 4. XP earned (weight: 15)
  const xpScore = patient.totalXpEarned >= 3000 ? 100 : patient.totalXpEarned >= 1000 ? 75 : patient.totalXpEarned >= 500 ? 50 : patient.totalXpEarned >= 100 ? 30 : 10;
  factors.push({ key: "xp", label: "Total XP", value: patient.totalXpEarned, weight: 15, contribution: xpScore * 0.15 });

  // 5. Badges earned (weight: 10)
  const badgeCount = patient._count?.badges || 0;
  const badgeScore = badgeCount >= 10 ? 100 : badgeCount >= 5 ? 75 : badgeCount >= 3 ? 50 : badgeCount >= 1 ? 25 : 0;
  factors.push({ key: "badges", label: "Badges", value: badgeCount, weight: 10, contribution: badgeScore * 0.10 });

  // 6. Mission completion (weight: 10)
  const completedMissions = patient._count?.completedMissions || 0;
  const totalMissions = patient._count?.totalMissions || 0;
  const missionRate = totalMissions > 0 ? (completedMissions / totalMissions) * 100 : 0;
  const missionScore = missionRate >= 80 ? 100 : missionRate >= 50 ? 70 : missionRate >= 25 ? 40 : missionRate > 0 ? 20 : 0;
  factors.push({ key: "missions", label: "Mission Rate", value: Math.round(missionRate), weight: 10, contribution: missionScore * 0.10 });

  const totalScore = Math.round(factors.reduce((sum, f) => sum + f.contribution, 0));
  const risk = totalScore >= 70 ? "low" : totalScore >= 45 ? "medium" : totalScore >= 25 ? "high" : "critical";

  return { score: totalScore, factors, risk };
}

/**
 * GET /api/admin/journey/ai-coach — Get retention dashboard data
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    const clinicFilter = clinicId ? { clinicId } : {};

    // Fetch all patients with progress data
    const progressRecords = await (prisma as any).patientProgress.findMany({
      where: clinicFilter,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // For each patient, count badges and missions
    const patientIds = progressRecords.map((p: any) => p.patientId);

    const [badgeCounts, missionCounts, completedMissionCounts, appointmentCounts] = await Promise.all([
      (prisma as any).patientBadge.groupBy({
        by: ["patientId"],
        where: { patientId: { in: patientIds } },
        _count: { id: true },
      }),
      (prisma as any).dailyMission.groupBy({
        by: ["patientId"],
        where: { patientId: { in: patientIds } },
        _count: { id: true },
      }),
      (prisma as any).dailyMission.groupBy({
        by: ["patientId"],
        where: { patientId: { in: patientIds }, completedAt: { not: null } },
        _count: { id: true },
      }),
      prisma.appointment.groupBy({
        by: ["patientId"],
        where: { patientId: { in: patientIds }, status: "COMPLETED" },
        _count: { id: true },
      }),
    ]);

    // Build lookup maps
    const badgeMap = Object.fromEntries(badgeCounts.map((b: any) => [b.patientId, b._count.id]));
    const missionMap = Object.fromEntries(missionCounts.map((m: any) => [m.patientId, m._count.id]));
    const completedMissionMap = Object.fromEntries(completedMissionCounts.map((m: any) => [m.patientId, m._count.id]));
    const appointmentMap = Object.fromEntries(appointmentCounts.map((a: any) => [a.patientId, a._count.id]));

    // Calculate retention scores for all patients
    const patients = progressRecords.map((p: any) => {
      const enriched = {
        ...p,
        _count: {
          badges: badgeMap[p.patientId] || 0,
          totalMissions: missionMap[p.patientId] || 0,
          completedMissions: completedMissionMap[p.patientId] || 0,
          appointments: appointmentMap[p.patientId] || 0,
        },
      };
      const retention = calculateRetentionScore(enriched);
      return {
        id: p.id,
        patientId: p.patientId,
        name: `${p.patient?.firstName || ""} ${p.patient?.lastName || ""}`.trim(),
        email: p.patient?.email,
        level: p.level,
        xp: p.totalXpEarned,
        streak: p.streakDays,
        longestStreak: p.longestStreak,
        credits: p.bprCredits,
        lastActive: p.lastActiveDate,
        archetype: p.archetypeKey,
        badges: badgeMap[p.patientId] || 0,
        appointments: appointmentMap[p.patientId] || 0,
        missionRate: enriched._count.totalMissions > 0
          ? Math.round((enriched._count.completedMissions / enriched._count.totalMissions) * 100)
          : 0,
        retention,
      };
    });

    // Sort by risk (critical first)
    const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    patients.sort((a: any, b: any) => riskOrder[a.retention.risk as keyof typeof riskOrder] - riskOrder[b.retention.risk as keyof typeof riskOrder]);

    // Summary stats
    const summary = {
      total: patients.length,
      critical: patients.filter((p: any) => p.retention.risk === "critical").length,
      high: patients.filter((p: any) => p.retention.risk === "high").length,
      medium: patients.filter((p: any) => p.retention.risk === "medium").length,
      low: patients.filter((p: any) => p.retention.risk === "low").length,
      avgScore: patients.length > 0 ? Math.round(patients.reduce((s: number, p: any) => s + p.retention.score, 0) / patients.length) : 0,
    };

    return NextResponse.json({ patients, summary });
  } catch (err: any) {
    console.error("[ai-coach] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/journey/ai-coach — Ask AI for retention insights
 * body: { action: "analyze_patient" | "suggest_campaign" | "general_insights", patientData?: any }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, patientData, patients: patientsInput, question } = await req.json();

    let prompt = "";

    if (action === "analyze_patient" && patientData) {
      prompt = `You are an AI retention coach for "Bruno Physical Rehabilitation" (BPR), a physiotherapy clinic in England.

Analyze this patient's engagement data and provide:
1. A brief assessment of their engagement status (2-3 sentences)
2. Top 3 risk factors for disengagement
3. Top 3 personalized retention actions the clinic should take
4. A suggested email/message to re-engage this patient (warm, personal tone)

Patient Data:
- Name: ${patientData.name}
- Retention Score: ${patientData.retention?.score}/100 (${patientData.retention?.risk} risk)
- Level: ${patientData.level} | XP: ${patientData.xp} | Streak: ${patientData.streak} days
- Longest Streak: ${patientData.longestStreak} days
- Last Active: ${patientData.lastActive ? new Date(patientData.lastActive).toLocaleDateString() : "Never"}
- Badges: ${patientData.badges} | Appointments: ${patientData.appointments}
- Mission Completion: ${patientData.missionRate}%
- Archetype: ${patientData.archetype || "Not set"}
- BPR Credits: ${patientData.credits}

Score Breakdown:
${patientData.retention?.factors?.map((f: any) => `  - ${f.label}: ${f.value} (${f.contribution.toFixed(1)}/${f.weight} pts)`).join("\n")}

Respond in JSON format:
{
  "assessment": "...",
  "riskFactors": ["...", "...", "..."],
  "actions": [
    { "title": "...", "description": "...", "priority": "high|medium|low", "type": "email|sms|call|offer|exercise|appointment" }
  ],
  "suggestedMessage": { "subject": "...", "body": "..." }
}`;
    } else if (action === "suggest_campaign" && patientsInput) {
      const atRiskSummary = patientsInput.slice(0, 20).map((p: any) =>
        `${p.name} (Score:${p.retention?.score}, Risk:${p.retention?.risk}, Streak:${p.streak}d, Last:${p.lastActive ? new Date(p.lastActive).toLocaleDateString() : "Never"})`
      ).join("\n");

      prompt = `You are an AI retention coach for "Bruno Physical Rehabilitation" (BPR), a physiotherapy clinic.

Based on these at-risk patients, suggest 3 targeted re-engagement campaigns:

At-Risk Patients (${patientsInput.length} total):
${atRiskSummary}

For each campaign provide:
1. Campaign name
2. Target segment description
3. Channel (email/sms/whatsapp/in-app)
4. Message template
5. Timing suggestion
6. Expected impact

Respond in JSON format:
{
  "campaigns": [
    {
      "name": "...",
      "segment": "...",
      "channel": "...",
      "messageTemplate": { "subject": "...", "body": "..." },
      "timing": "...",
      "expectedImpact": "..."
    }
  ]
}`;
    } else if (action === "general_insights") {
      prompt = `You are an AI retention coach for "Bruno Physical Rehabilitation" (BPR), a physiotherapy clinic.

${question || "Provide general retention insights and actionable recommendations for a physiotherapy clinic."}

Focus on:
- Patient engagement best practices for physiotherapy
- How to use gamification effectively (XP, badges, streaks, challenges)
- Re-engagement strategies for patients who stopped attending
- Seasonal trends and opportunities
- Pricing/membership strategies to increase retention

Respond in JSON format:
{
  "insights": [
    { "title": "...", "description": "...", "actionable": true, "priority": "high|medium|low" }
  ],
  "quickWins": ["...", "...", "..."],
  "longTermStrategies": ["...", "...", "..."]
}`;
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const rawText = await callAI(prompt, { temperature: 0.7, maxTokens: 2048 });

    // Try to extract JSON from the response
    let parsed: any = null;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // If parsing fails, return raw text
    }

    return NextResponse.json({ result: parsed, rawText });
  } catch (err: any) {
    console.error("[ai-coach] POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
