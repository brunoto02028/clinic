export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, getSessionStaffActor, accessErrorResponse, AccessError } from "@/lib/tenant-access";
import { desviosDosPontos, type Desvio } from "@/lib/monitoring-deviation";
import { logAudit } from "@/lib/system-logger";

/**
 * A fila de desvios da clínica (099 T-6).
 *
 * ## O desvio não é guardado
 *
 * Ele é recalculado a partir dos pontos. Copiar o número criaria duas verdades
 * sobre a mesma medição, e a cópia envelheceria sozinha — uma correção de
 * dado na origem deixaria um alerta mentindo na fila para sempre.
 *
 * O que persiste é o **reconhecimento**: alguém da clínica olhou, e quando.
 *
 * ## Nada disto chega ao paciente
 *
 * É a regra inteira desta tarefa. A clínica vê, a clínica decide se fala com a
 * pessoa — e fala como gente, não como alerta automático.
 */

const JANELA_DIAS = 30;

async function staffDaClinica(request: NextRequest) {
  const actor = (await getSessionStaffActor(request)) ?? (await getActor(request));
  if (!actor) throw new AccessError(401, "Unauthorised");
  if (actor.role === "PATIENT") throw new AccessError(404, "Not found");
  if (!actor.clinicId) throw new AccessError(409, "This account is not linked to a clinic");
  return actor;
}

export async function GET(request: NextRequest) {
  try {
    const actor = await staffDaClinica(request);

    const desde = new Date();
    desde.setDate(desde.getDate() - JANELA_DIAS);
    const desdeStr = desde.toISOString().split("T")[0];

    /**
     * Uma consulta só, para a clínica inteira.
     *
     * Percorrer paciente a paciente seria uma consulta por pessoa numa tela
     * que abre o dia todo. Os pontos vêm juntos e são agrupados aqui.
     */
    const pontos = await (prisma as any).wearableDataPoint.findMany({
      where: {
        dataDate: { gte: desdeStr },
        user: { clinicId: actor.clinicId, role: "PATIENT", deletedAt: null },
      },
      orderBy: { dataDate: "asc" },
      select: {
        userId: true,
        dataType: true,
        dataDate: true,
        restingHr: true,
        hrv: true,
        spo2: true,
        sleepDuration: true,
        rawPayload: true,
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const porPaciente = new Map<string, { nome: string; pontos: any[] }>();
    for (const p of pontos as any[]) {
      const atual = porPaciente.get(p.userId) ?? {
        nome: `${p.user.firstName} ${p.user.lastName}`,
        pontos: [],
      };
      atual.pontos.push(p);
      porPaciente.set(p.userId, atual);
    }

    const achados: Array<Desvio & { patientId: string; patientName: string; seenAt?: string; seenBy?: string }> = [];
    for (const [patientId, { nome, pontos: seus }] of porPaciente) {
      for (const d of desviosDosPontos(seus)) {
        achados.push({ ...d, patientId, patientName: nome });
      }
    }

    // Quem já foi visto continua na lista, marcado — some da fila de pendentes
    // sem sumir do histórico de quem olhou o quê.
    const acks = achados.length
      ? await (prisma as any).monitoringAlertAck.findMany({
          where: {
            clinicId: actor.clinicId,
            OR: achados.map((a) => ({ patientId: a.patientId, alertKey: a.chave })),
          },
          select: { patientId: true, alertKey: true, seenAt: true, seenById: true },
        })
      : [];

    const nomesDeQuemViu = new Map<string, string>();
    if (acks.length) {
      const equipe = await prisma.user.findMany({
        where: { id: { in: [...new Set((acks as any[]).map((a) => a.seenById))] } },
        select: { id: true, firstName: true, lastName: true },
      });
      for (const p of equipe) nomesDeQuemViu.set(p.id, `${p.firstName} ${p.lastName}`);
    }

    const vistos = new Map(
      (acks as any[]).map((a) => [`${a.patientId}|${a.alertKey}`, a])
    );

    const comVisto = achados.map((a) => {
      const v = vistos.get(`${a.patientId}|${a.chave}`);
      return v
        ? { ...a, seenAt: v.seenAt.toISOString(), seenBy: nomesDeQuemViu.get(v.seenById) ?? "" }
        : a;
    });

    return NextResponse.json({
      deviations: comVisto,
      pending: comVisto.filter((a) => !a.seenAt).length,
      windowDays: JANELA_DIAS,
    });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[monitoring/deviations] GET:", (err as Error)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await staffDaClinica(request);
    const body = await request.json().catch(() => null);
    const patientId = typeof body?.patientId === "string" ? body.patientId : "";
    const alertKey = typeof body?.alertKey === "string" ? body.alertKey : "";

    if (!patientId || !alertKey) {
      return NextResponse.json({ error: "patientId and alertKey are required" }, { status: 400 });
    }

    // O paciente tem de ser desta clínica. Sem isto, um `patientId` digitado
    // marcaria como visto um achado de outro tenant.
    const paciente = await prisma.user.findFirst({
      where: { id: patientId, clinicId: actor.clinicId, role: "PATIENT" },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    if (!paciente) throw new AccessError(404, "Not found");

    await (prisma as any).monitoringAlertAck.upsert({
      where: { patientId_alertKey: { patientId, alertKey } },
      // Quem viu primeiro fica: o reconhecimento é de quem olhou, e o segundo
      // clique não reescreve a história do primeiro.
      update: {},
      create: { clinicId: actor.clinicId!, patientId, alertKey, seenById: actor.userId },
    });

    logAudit({
      userId: actor.userId,
      userEmail: "",
      userRole: actor.role,
      action: "MONITORING_ALERT_SEEN",
      entity: "User",
      entityId: patientId,
      description: `Marked monitoring finding ${alertKey} as seen for ${paciente.firstName} ${paciente.lastName}`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[monitoring/deviations] POST:", (err as Error)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
