import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { callAI } from "@/lib/ai-provider";

export const dynamic = "force-dynamic";

/**
 * GET /api/patient/ai-coach — Get personalized AI recommendations based on patient's clinical data
 * Returns cached tip if generated today, otherwise generates fresh one
 */
export async function GET() {
  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = effectiveUser.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, clinicId: true, preferredLocale: true } as any,
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const isPt = ((user as any).preferredLocale || "en-GB").startsWith("pt");

    // Check for cached tip from today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const cached = await (prisma as any).journeyNotification.findFirst({
      where: { patientId: userId, type: "ai_coach_tip", createdAt: { gte: todayStart } },
      orderBy: { createdAt: "desc" },
    });

    if (cached) {
      return NextResponse.json({
        tip: cached.message,
        title: cached.title,
        cached: true,
        generatedAt: cached.createdAt,
      });
    }

    // Gather patient context
    const [screening, diagnosis, protocol, progress, quizResult] = await Promise.all([
      prisma.medicalScreening.findUnique({ where: { userId } }).catch(() => null),
      (prisma as any).aIDiagnosis.findFirst({
        where: { patientId: userId, status: { in: ["APPROVED", "SENT_TO_PATIENT"] } },
        orderBy: { createdAt: "desc" },
        select: { summary: true, conditions: true, recommendations: true },
      }).catch(() => null),
      (prisma as any).treatmentProtocol.findFirst({
        where: { patientId: userId, status: "SENT_TO_PATIENT" },
        orderBy: { createdAt: "desc" },
        select: { title: true, summary: true, goals: true, items: { select: { title: true, phase: true, type: true, isCompleted: true }, take: 20 } },
      }).catch(() => null),
      (prisma as any).patientProgress.findUnique({ where: { patientId: userId } }).catch(() => null),
      (prisma as any).patientQuizResult.findFirst({
        where: { patientId: userId },
        orderBy: { completedAt: "desc" },
        select: { archetypeKey: true },
      }).catch(() => null),
    ]);

    // Build context summary for AI
    const contextParts: string[] = [];

    if (screening) {
      const s = screening as any;
      const conditions: string[] = [];
      if (s.currentConditions) conditions.push(`Current conditions: ${s.currentConditions}`);
      if (s.painLevel) conditions.push(`Pain level: ${s.painLevel}/10`);
      if (s.painLocation) conditions.push(`Pain location: ${s.painLocation}`);
      if (s.medications) conditions.push(`Medications: ${s.medications}`);
      if (s.surgicalHistory) conditions.push(`Surgical history: ${s.surgicalHistory}`);
      if (s.exerciseFrequency) conditions.push(`Exercise frequency: ${s.exerciseFrequency}`);
      if (conditions.length) contextParts.push(`MEDICAL SCREENING:\n${conditions.join("\n")}`);
    }

    if (diagnosis) {
      contextParts.push(`AI DIAGNOSIS:\n${diagnosis.summary}`);
      if (Array.isArray(diagnosis.conditions)) {
        const conds = diagnosis.conditions.map((c: any) => `- ${c.name} (${c.severity}): ${c.description || ""}`).join("\n");
        if (conds) contextParts.push(`CONDITIONS:\n${conds}`);
      }
    }

    if (protocol) {
      contextParts.push(`TREATMENT PROTOCOL: ${protocol.title}\n${protocol.summary}`);
      if (protocol.items?.length) {
        const completed = protocol.items.filter((i: any) => i.isCompleted).length;
        const total = protocol.items.length;
        contextParts.push(`Protocol progress: ${completed}/${total} items completed`);
      }
    }

    if (progress) {
      contextParts.push(`JOURNEY: Level ${progress.level || 1}, ${progress.streakDays || 0}-day streak, ${progress.totalXpEarned || 0} total XP`);
    }

    if (quizResult?.archetypeKey) {
      const archetypeNames: Record<string, string> = {
        executive: "Determined Executive (busy schedule, needs efficiency)",
        methodical: "Methodical Patient (follows plans, needs variety)",
        athlete: "Recovering Athlete (tends to push too hard)",
        cautious: "Cautious Beginner (afraid of making things worse)",
      };
      contextParts.push(`PERSONALITY: ${archetypeNames[quizResult.archetypeKey] || quizResult.archetypeKey}`);
    }

    // If no clinical data at all, return a generic welcome tip
    if (contextParts.length === 0) {
      const genericTip = isPt
        ? "Complete seu screening médico e o quiz de perfil para receber dicas personalizadas baseadas na sua condição!"
        : "Complete your medical screening and profile quiz to receive personalized tips based on your condition!";
      const genericTitle = isPt ? "Comece sua jornada personalizada" : "Start your personalized journey";
      return NextResponse.json({ tip: genericTip, title: genericTitle, cached: false, hasData: false });
    }

    const lang = isPt ? "Brazilian Portuguese" : "English";
    const prompt = `You are an AI health coach for a physiotherapy patient named ${user.firstName || "the patient"}.
Based on the following clinical data, generate ONE practical, encouraging daily health tip.

${contextParts.join("\n\n")}

RULES:
- Write in ${lang}
- Keep it under 120 words
- Be specific to their condition and treatment
- Include ONE actionable suggestion they can do today
- Be warm but professional
- If they have a streak going, acknowledge it
- If their archetype is known, tailor your communication style
- Do NOT give medical diagnoses or contradict their treatment plan
- Format: Return a JSON object with "title" (short 5-8 word title) and "tip" (the full message)`;

    let title = isPt ? "Dica do dia" : "Today's tip";
    let tip = isPt ? "Continue seguindo seu plano de tratamento!" : "Keep following your treatment plan!";

    try {
      const response = await callAI(prompt, { temperature: 0.8, maxTokens: 300 });
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.title) title = parsed.title;
        if (parsed.tip) tip = parsed.tip;
      } else {
        tip = response.trim();
      }
    } catch (aiErr) {
      console.error("[ai-coach] AI call failed:", aiErr);
    }

    // Cache the tip as a journey notification
    try {
      await (prisma as any).journeyNotification.create({
        data: {
          patientId: userId,
          clinicId: (user as any).clinicId,
          type: "ai_coach_tip",
          title,
          message: tip,
        },
      });
    } catch {}

    return NextResponse.json({ tip, title, cached: false, hasData: true, generatedAt: new Date() });
  } catch (err: any) {
    console.error("[ai-coach] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
