import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { patientGate } from "@/lib/patient-gate";
import { getZonedDateString } from "@/lib/clinic-timezone";

export const dynamic = "force-dynamic";

/**
 * Hoje **no fuso da clínica**, não no do servidor.
 *
 * Era `new Date().toISOString()`, que é UTC. Em produção o servidor roda em
 * UTC e a clínica vive em Londres: durante o horário de verão britânico, entre
 * meia-noite e uma da manhã, isso dava três defeitos de uma vez — o registro
 * era arquivado como ontem, a data local de hoje era **recusada como futuro**,
 * e a sequência não contava um registro que era de hoje (revisão de
 * 26/09/2026).
 *
 * `getZonedDateString` já existia no repositório exatamente para isto, e a
 * rota de disponibilidade já a usava.
 */
function todayStr() {
  return getZonedDateString();
}

/**
 * GET /api/patient/daily-checkin
 * Returns today's check-in (if done) + last 7 days history
 */
export async function GET() {
  // Consentimento e plano valem no servidor, não só na tela (auditoria de paridade, 24/09/2026).
  const __gate = await patientGate({ module: "mod_journey" });
  if (__gate.response) return __gate.response;

  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = effectiveUser.userId;
    const today = todayStr();

    const [todayCheckIns, history, progress] = await Promise.all([
      // `findMany`, não `findUnique`: um dia pode ter manhã, tarde e noite
      // desde a 087, e `findUnique` devolveria um dos três sem dizer qual.
      (prisma as any).dailyCheckIn.findMany({
        where: { patientId: userId, checkinDate: today },
        orderBy: { createdAt: "asc" },
      }),
      (prisma as any).dailyCheckIn.findMany({
        where: { patientId: userId },
        orderBy: [{ checkinDate: "desc" }, { createdAt: "asc" }],
        // Catorze dias, que é até onde o registro retroativo vai — e agora
        // cabem até quatro por dia.
        take: 60,
      }),
      (prisma as any).patientProgress.findUnique({
        where: { patientId: userId },
        select: { streakDays: true, longestStreak: true, xp: true, level: true, levelTitle: true, totalXpEarned: true },
      }),
    ]);

    return NextResponse.json({
      // `today` continua sendo um só, para não quebrar quem já lê este campo:
      // é o registro do dia inteiro se existir, senão o primeiro do dia.
      today: todayCheckIns.find((c: any) => c.period === "day") ?? todayCheckIns[0] ?? null,
      todayAll: todayCheckIns,
      history,
      todayDate: today,
      progress,
    });
  } catch (err: any) {
    console.error("[daily-checkin GET]", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

/**
 * POST /api/patient/daily-checkin
 * Save or update today's check-in
 */
export async function POST(req: NextRequest) {
  // Consentimento e plano valem no servidor, não só na tela (auditoria de paridade, 24/09/2026).
  const __gate = await patientGate({ module: "mod_journey" });
  if (__gate.response) return __gate.response;

  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = effectiveUser.userId;
    const _u = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } });
    const clinicId = _u?.clinicId || null;

    const body = await req.json();
    const { painLevel, moodLevel, exercisesDone, notes, energyLevel, sleepQuality, stressLevel, hrv } = body;

    // `typeof`, e não `!== undefined`: `{"painLevel": null}` passava, e
    // `Math.max(0, null)` gravava **0 — sem dor**. Inventar dado clínico é
    // pior que recusar o pedido (revisão de 26/09/2026).
    if (typeof painLevel !== "number" || !Number.isFinite(painLevel)) {
      return NextResponse.json({ error: "painLevel must be a number" }, { status: 400 });
    }
    if (typeof moodLevel !== "number" || !Number.isFinite(moodLevel)) {
      return NextResponse.json({ error: "moodLevel must be a number" }, { status: 400 });
    }

    const today = todayStr();

    /**
     * O dia que o registro descreve.
     *
     * Era sempre hoje, cravado. O Bruno: *"o paciente pode querer virar todo
     * dia... então ele colocar uma data e enviar."* Quem esqueceu ontem não
     * tinha como registrar ontem, e a dor de ontem não deixa de ter existido.
     *
     * Duas bordas, e as duas são sobre o registro ser verdade:
     *
     * - **nunca o futuro** — ninguém relata a dor que ainda não sentiu;
     * - **no máximo catorze dias atrás** — além disso não é lembrança, é
     *   reconstrução, e um gráfico feito de reconstrução engana quem o lê.
     */
    const pedida = typeof body.checkinDate === "string" ? body.checkinDate.trim() : "";
    let checkinDate = today;
    if (pedida) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(pedida)) {
        return NextResponse.json({ error: "checkinDate must be YYYY-MM-DD" }, { status: 400 });
      }
      const limite = new Date(`${today}T12:00:00.000Z`);
      limite.setUTCDate(limite.getUTCDate() - 14);
      const maisAntiga = limite.toISOString().slice(0, 10);
      if (pedida > today) {
        return NextResponse.json({ error: "You cannot check in for a future date" }, { status: 400 });
      }
      if (pedida < maisAntiga) {
        return NextResponse.json({ error: "You can only go back 14 days", earliest: maisAntiga }, { status: 400 });
      }
      checkinDate = pedida;
    }

    /**
     * Manhã, tarde ou noite.
     *
     * O Bruno: *"pode piorar de manhã à noite."* A dor da manhã e a da noite
     * são **dois fatos**, e até aqui o segundo sobrescrevia o primeiro — a
     * chave única era só paciente + dia.
     *
     * `day` é o valor de quem não escolhe, e é o que os registros anteriores
     * a isto têm: eles descrevem o dia, sem dizer a hora. Fingir que eram de
     * manhã seria inventar dado clínico.
     */
    const PERIODOS = ["day", "morning", "afternoon", "evening"] as const;
    const periodoPedido = typeof body.period === "string" ? body.period.trim() : "";
    if (periodoPedido && !PERIODOS.includes(periodoPedido as any)) {
      return NextResponse.json(
        { error: "period must be one of: " + PERIODOS.join(", ") },
        { status: 400 }
      );
    }
    const period = periodoPedido || "day";

    const bioFields = {
      energyLevel:  energyLevel  != null ? Math.min(10, Math.max(1, energyLevel))  : null,
      sleepQuality: sleepQuality != null ? Math.min(10, Math.max(1, sleepQuality)) : null,
      stressLevel:  stressLevel  != null ? Math.min(10, Math.max(1, stressLevel))  : null,
      // `Number("x")` é NaN, e o Prisma lança — 500 num valor que o cliente
      // mandou torto. Torto vira ausente.
      hrv:          Number.isFinite(Number(hrv)) ? Number(hrv)                      : null,
    };

    /**
     * Já existia um registro para este dia e período? (QA da 095, achado 7.4)
     *
     * O `upsert` substitui e devolve uma resposta **idêntica** à de um registro
     * novo — nada dizia que algo foi trocado. Quem corrige a dor de ontem
     * merece saber que corrigiu, e não ficar na dúvida se criou um segundo.
     *
     * Lido antes do `upsert`, porque depois dele a diferença não existe mais.
     */
    const jaHavia = await (prisma as any).dailyCheckIn.findUnique({
      where: { patientId_checkinDate_period: { patientId: userId, checkinDate, period } },
      select: { id: true },
    });

    const checkIn = await (prisma as any).dailyCheckIn.upsert({
      where: { patientId_checkinDate_period: { patientId: userId, checkinDate, period } },
      create: {
        patientId: userId,
        clinicId,
        checkinDate,
        period,
        painLevel: Math.min(10, Math.max(0, painLevel)),
        moodLevel: Math.min(5, Math.max(1, moodLevel)),
        exercisesDone: exercisesDone ?? false,
        notes: notes || null,
        ...bioFields,
      },
      update: {
        painLevel: Math.min(10, Math.max(0, painLevel)),
        moodLevel: Math.min(5, Math.max(1, moodLevel)),
        exercisesDone: exercisesDone ?? false,
        notes: notes || null,
        ...bioFields,
      },
    });

    // Award XP + update streak
    let streak = { current: 0, longest: 0, isNewRecord: false };
    let xpDado = 0;
    try {
      let progress = await (prisma as any).patientProgress.findUnique({ where: { patientId: userId } });
      if (!progress) {
        progress = await (prisma as any).patientProgress.create({
          data: { patientId: userId, level: 1, levelTitle: 'Iniciante', xp: 0, xpToNextLevel: 100, streakDays: 0, longestStreak: 0, totalXpEarned: 0, bprCredits: 0 },
        });
      }

      const lastActive = progress.lastActiveDate
        ? new Date(progress.lastActiveDate).toISOString().split("T")[0]
        : null;
      const alreadyActive = lastActive === today;

      // XP e sequência só valem para **hoje**. Registrar ontem é corrigir o
      // histórico, e corrigir o histórico não pode virar moeda: quem voltasse
      // catorze dias ganharia catorze sequências de uma vez.
      // Uma vez por dia, não uma por período: três registros num dia são três
      // olhares sobre o mesmo dia, não três dias de constância.
      if (!alreadyActive && checkinDate === today) {
        const xpData: any = { xp: { increment: 15 }, totalXpEarned: { increment: 15 }, bprCredits: { increment: 1 }, lastActiveDate: new Date() };

        if (exercisesDone) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split("T")[0];

          if (lastActive === yesterdayStr) {
            xpData.streakDays = { increment: 1 };
          } else {
            xpData.streakDays = 1;
          }
        }

        const updated = await (prisma as any).patientProgress.update({
          where: { patientId: userId },
          data: xpData,
        });
        xpDado = 15;

        if (exercisesDone && updated.streakDays > updated.longestStreak) {
          await (prisma as any).patientProgress.update({
            where: { patientId: userId },
            data: { longestStreak: updated.streakDays },
          });
          updated.longestStreak = updated.streakDays;
        }

        streak = {
          current: updated.streakDays,
          longest: Math.max(updated.streakDays, updated.longestStreak),
          isNewRecord: updated.streakDays > progress.longestStreak,
        };
      } else {
        streak = { current: progress.streakDays, longest: progress.longestStreak, isNewRecord: false };
      }
    } catch {}

    // `xpAwarded` era 15 sempre, inclusive num registro retroativo ou num
    // segundo período do mesmo dia, que não ganham nada. A tela mostrava
    // "+15 XP" que não existia.
    return NextResponse.json({ checkIn, xpAwarded: xpDado, streak, substituiu: !!jaHavia });
  } catch (err: any) {
    console.error("[daily-checkin POST]", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
