export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getActor,
  getSessionStaffActor,
  accessErrorResponse,
  AccessError,
} from "@/lib/tenant-access";
import { gerarRelatoriosVencidos } from "@/lib/patient-report-schedule";
import { logAudit } from "@/lib/system-logger";

/**
 * A chave mestra do acompanhamento automático, e a cadência de cada um
 * (099 T-5).
 *
 * ## Por que a chave nasce desligada
 *
 * Ligar é o instante em que relatórios passam a ser gerados para **todos** os
 * pacientes ativos da clínica. Não é uma configuração tímida: é a diferença
 * entre uma automação que alguém escolheu ligar e um disparo em massa que
 * ninguém viu chegando.
 *
 * O Bruno pediu a automação completa e disse, na mesma frase, que quer ver
 * tudo funcionando como paciente de teste primeiro. Isto é as duas coisas.
 */

async function staff(request: NextRequest) {
  const actor = (await getSessionStaffActor(request)) ?? (await getActor(request));
  if (!actor) throw new AccessError(401, "Unauthorised");
  if (actor.role === "PATIENT") throw new AccessError(404, "Not found");
  if (!actor.clinicId) throw new AccessError(409, "This account is not linked to a clinic");
  return actor;
}

export async function GET(request: NextRequest) {
  try {
    const actor = await staff(request);
    const clinica = await prisma.clinic.findUnique({
      where: { id: actor.clinicId! },
      select: { autoReportsEnabled: true, defaultReportCadence: true },
    });

    const [gerados, pacientesAtivos, vazios] = await Promise.all([
      (prisma as any).patientReport
        .count({ where: { clinicId: actor.clinicId, hasData: true } })
        .catch(() => 0),
      prisma.user.count({
        where: {
          clinicId: actor.clinicId,
          role: "PATIENT",
          isActive: true,
          deletedAt: null,
          isClinicPatient: true,
        },
      }),
      /**
       * De quem não veio nada (099, pedido do Bruno).
       *
       * *"Se não tiver nenhum tipo de informação, eu vou ser avisado"*. A
       * linha existe para registrar que olhamos; o paciente não a vê, e a
       * clínica vê aqui — com o nome, porque "3 sem dados" não diz a quem
       * perguntar.
       */
      (prisma as any).patientReport
        .findMany({
          where: { clinicId: actor.clinicId, hasData: false },
          orderBy: { periodStart: "desc" },
          take: 20,
          select: {
            id: true,
            periodStart: true,
            patient: { select: { id: true, firstName: true, lastName: true } },
          },
        })
        .catch(() => []),
    ]);

    return NextResponse.json({
      noData: (vazios as any[]).map((v) => ({
        id: v.id,
        periodStart: v.periodStart,
        patientId: v.patient.id,
        patientName: `${v.patient.firstName} ${v.patient.lastName}`,
      })),
      enabled: !!clinica?.autoReportsEnabled,
      defaultCadence: clinica?.defaultReportCadence ?? "WEEKLY",
      reportsGenerated: gerados,
      // Quantas pessoas a chave alcança. Ligar sem saber o número seria ligar
      // no escuro.
      patientsAffected: pacientesAtivos,
    });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[monitoring/reports] GET:", (err as Error)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await staff(request);
    const body = await request.json().catch(() => null);

    // ── a cadência de um paciente ──
    if (typeof body?.patientId === "string") {
      const cadence = body?.cadence;
      if (cadence !== null && !["NONE", "DAILY", "WEEKLY"].includes(cadence)) {
        return NextResponse.json({ error: "Invalid cadence" }, { status: 400 });
      }
      const paciente = await prisma.user.findFirst({
        where: { id: body.patientId, clinicId: actor.clinicId, role: "PATIENT" },
        select: { id: true },
      });
      if (!paciente) throw new AccessError(404, "Not found");

      // `null` devolve a pessoa ao padrão da clínica — não é o mesmo que NONE,
      // que é uma recusa explícita dela.
      await prisma.user.update({
        where: { id: paciente.id },
        data: { reportCadence: cadence },
      });
      return NextResponse.json({ ok: true });
    }

    // ── a chave da clínica ──
    if (typeof body?.enabled === "boolean") {
      await prisma.clinic.update({
        where: { id: actor.clinicId! },
        data: {
          autoReportsEnabled: body.enabled,
          ...(body.defaultCadence && ["NONE", "DAILY", "WEEKLY"].includes(body.defaultCadence)
            ? { defaultReportCadence: body.defaultCadence }
            : {}),
        },
      });

      logAudit({
        userId: actor.userId,
        userEmail: "",
        userRole: actor.role,
        action: body.enabled ? "AUTO_REPORTS_ENABLED" : "AUTO_REPORTS_DISABLED",
        entity: "Clinic",
        entityId: actor.clinicId!,
        description: `Automatic patient reports turned ${body.enabled ? "on" : "off"}`,
      });

      // Ligar gera a primeira rodada na hora, em vez de esperar até a hora
      // cheia — quem acabou de ligar quer ver acontecer.
      const r = body.enabled
        ? await gerarRelatoriosVencidos({ clinicId: actor.clinicId! })
        : null;

      return NextResponse.json({ ok: true, firstRun: r });
    }

    return NextResponse.json({ error: "Nothing to do" }, { status: 400 });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[monitoring/reports] POST:", (err as Error)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
