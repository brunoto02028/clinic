export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getActor,
  getSessionStaffActor,
  accessErrorResponse,
  AccessError,
} from "@/lib/tenant-access";
import { getMonitoringData } from "@/lib/patient-monitoring";
import { desviosDosPontos } from "@/lib/monitoring-deviation";

/**
 * O quadro de um paciente ao longo do tempo (099 T-3).
 *
 * ## Por que numa rota só
 *
 * Sono caindo **enquanto** a dor sobe é o tipo de coisa que ninguém vê olhando
 * uma aba por vez — e era isso que o painel oferecia: atividade numa aba,
 * aderência noutra, bem-estar numa terceira. Uma resposta, uma janela de tempo
 * para todas as séries.
 *
 * ## O que "sem dado" significa aqui
 *
 * As séries vêm com os dias que **têm** dado. A tela desenha buraco, não zero:
 * uma noite sem o relógio no pulso não é uma noite sem sono, e a ausência é
 * informação — ela diz que a pessoa parou de usar o aparelho.
 */
/**
 * A marca de "não consegui ler as metas".
 *
 * Um objecto próprio, porque `null` já significa outra coisa aqui — *"o
 * paciente não definiu nenhuma"* — e misturar as duas é o que fazia o painel
 * afirmar uma escolha que ninguém fez.
 */
const ILEGIVEL = Symbol("metas-ilegiveis");

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = (await getSessionStaffActor(request)) ?? (await getActor(request));
    if (!actor) throw new AccessError(401, "Unauthorised");
    // Quem vê o quadro de um paciente é a equipe da clínica dele. Outro tenant
    // recebe 404: dizer "existe, mas não é seu" conta que a pessoa existe.
    if (actor.role === "PATIENT") throw new AccessError(404, "Not found");

    const paciente = await prisma.user.findFirst({
      where: { id: params.id, clinicId: actor.clinicId, role: "PATIENT" },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!paciente) throw new AccessError(404, "Not found");

    const days = Math.min(
      Math.max(parseInt(request.nextUrl.searchParams.get("days") || "30", 10) || 30, 7),
      365
    );

    const desde = new Date();
    desde.setDate(desde.getDate() - days);
    const desdeStr = desde.toISOString().split("T")[0];

    const [monitoring, pontos, checkins, pressao, metas] = await Promise.all([
      getMonitoringData(paciente.id, { days }),
      (prisma as any).wearableDataPoint.findMany({
        where: { userId: paciente.id, dataDate: { gte: desdeStr } },
        orderBy: { dataDate: "asc" },
        select: {
          dataType: true,
          dataDate: true,
          restingHr: true,
          hrv: true,
          spo2: true,
          sleepDuration: true,
          steps: true,
          rawPayload: true,
        },
      }).catch(() => []),
      (prisma as any).dailyCheckIn.findMany({
        where: { patientId: paciente.id, checkinDate: { gte: desdeStr } },
        orderBy: { checkinDate: "asc" },
        select: { checkinDate: true, painLevel: true, moodLevel: true },
      }).catch(() => []),
      (prisma as any).bloodPressureReading.findMany({
        where: { patientId: paciente.id, measuredAt: { gte: desde } },
        orderBy: { measuredAt: "asc" },
        select: { systolic: true, diastolic: true, measuredAt: true },
      }).catch(() => []),
      /*
       * **As metas que o paciente definiu** (118 T-7).
       *
       * Regra do Bruno: *"o que aparece no app precisa aparecer na clinic, pois
       * lá é o centro de comando"*. Se ele vê uma barra de progresso no
       * telemóvel, o terapeuta tem de ver contra o quê — senão a consulta
       * acontece com os dois a olhar para números diferentes.
       *
       * São **do paciente**, e o painel lê e não escreve: quem as define é ele.
       */
      prisma.patientGoals
        .findUnique({
          where: { userId: paciente.id },
          select: { steps: true, activeMinutes: true, sleepMinutes: true, activeCalories: true, updatedAt: true },
        })
        /*
         * **Não pude ler** é diferente de **não definiu nenhuma**, e o `.catch`
         * a devolver `null` fazia as duas serem a mesma frase: o painel
         * afirmava *"None set yet — these are the patient's to choose"* quando a
         * verdade era que o dado não chegou. Como não há `prisma/migrations` e o
         * deploy aplica por `db push` — que engole a falha —, a tabela em falta
         * em produção cairia exactamente aqui, calada.
         */
        .catch(() => ILEGIVEL),
    ]);

    const serie = (tipo: string, campo: string) =>
      (pontos as any[])
        .filter((p) => p.dataType === tipo && p[campo] != null)
        .map((p) => ({ dia: p.dataDate as string, valor: p[campo] as number }));

    return NextResponse.json({
      patient: paciente,
      days,
      monitoring,
      /** `null` quando o paciente não definiu nenhuma — e isso é informação. */
      goals: metas === ILEGIVEL ? null : metas,
      /** E isto é a outra coisa: a leitura falhou, não houve escolha nenhuma. */
      goalsUnreadable: metas === ILEGIVEL,
      // Os desvios do próprio paciente, para a ficha dele repetir o que a fila
      // da clínica já mostra — sem obrigar quem abriu a ficha a ir até lá.
      deviations: desviosDosPontos(pontos as any[]),
      series: {
        sleepDuration: serie("SLEEP", "sleepDuration"),
        restingHr: serie("BODY", "restingHr"),
        hrv: serie("BODY", "hrv"),
        spo2: serie("BODY", "spo2"),
        steps: serie("ACTIVITY", "steps"),
        pain: (checkins as any[]).map((c) => ({ dia: c.checkinDate, valor: c.painLevel })),
        mood: (checkins as any[]).map((c) => ({ dia: c.checkinDate, valor: c.moodLevel })),
        systolic: (pressao as any[]).map((r) => ({
          dia: new Date(r.measuredAt).toISOString().split("T")[0],
          valor: r.systolic,
        })),
      },
    });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[patients/monitoring] GET:", (err as Error)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
