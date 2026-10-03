export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serieDaMetrica } from "@/lib/onde-mora-a-metrica";
import { MAXIMO_DE_ECGS, cortouRegistos, ateAoLimite } from "@/lib/ecg-limite";
import {
  getActor,
  getSessionStaffActor,
  accessErrorResponse,
  AccessError,
} from "@/lib/tenant-access";
import { getMonitoringData, pressaoPorDia, mediaPorDia } from "@/lib/patient-monitoring";
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

    const [monitoring, pontos, checkins, pressao, metas, ecgs] = await Promise.all([
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
        /* `timezone` é o que faz o dia da pressão ser o da medição (120 T-3). */
        select: { systolic: true, diastolic: true, measuredAt: true, timezone: true },
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
      /*
       * Os ECG, **um por gravação** (119 T-2).
       *
       * Regra do Bruno: o que aparece no app aparece na clinic. O paciente vê
       * duas gravações de 1 de outubro, com a hora de cada uma; o terapeuta
       * tem de ver as mesmas duas. Antes disto o painel via o que sobrava de
       * uma linha por dia — ou seja, uma.
       */
      prisma.ecgRecording
        .findMany({
          where: { userId: paciente.id, recordedAt: { gte: desde } },
          orderBy: { recordedAt: "desc" },
          select: { id: true, recordedAt: true, heartRate: true, conclusao: true },
          take: MAXIMO_DE_ECGS + 1,
        })
        .catch(() => ILEGIVEL),
    ]);

    /**
     * **O balde vem do mapa** (119 T-9).
     *
     * Isto chamava `serie("BODY", …)` para as três, e `BODY` nunca é escrito
     * pela ingestão da Withings. A tela da clínica mostrava FC de repouso, VFC e
     * SpO2 vazias para **todos** os pacientes — e nada distinguia *"não mediu"*
     * de *"estamos a olhar para a gaveta errada"*.
     */
    const serie = (campo: string) =>
      serieDaMetrica(pontos as any[], campo).filter((v) => v.valor !== null);

    return NextResponse.json({
      patient: paciente,
      days,
      monitoring,
      /** `null` quando o paciente não definiu nenhuma — e isso é informação. */
      goals: metas === ILEGIVEL ? null : metas,
      /** E isto é a outra coisa: a leitura falhou, não houve escolha nenhuma. */
      goalsUnreadable: metas === ILEGIVEL,
      /** Uma linha por gravação, com o instante — o dia é do fuso de quem lê. */
      ecgRecordings:
        ecgs === ILEGIVEL
          ? []
          : ateAoLimite(ecgs as any[]).map((e) => ({
              id: e.id,
              recordedAt: e.recordedAt.toISOString(),
              heartRate: e.heartRate,
              conclusao: e.conclusao,
            })),
      /** O mesmo tecto do app — senão as duas telas contavam diferente. */
      ecgsCortados: ecgs !== ILEGIVEL && cortouRegistos((ecgs as any[]).length),
      ecgUnreadable: ecgs === ILEGIVEL,
      // Os desvios do próprio paciente, para a ficha dele repetir o que a fila
      // da clínica já mostra — sem obrigar quem abriu a ficha a ir até lá.
      /*
       * As gravações vão junto — **sem elas não há fibrilhação nenhuma aqui**.
       * O ECG mudou de casa em 02/10 e esta chamada continuou a ler só os
       * pontos diários, que a ingestão já não escreve.
       */
      deviations: desviosDosPontos(
        pontos as any[],
        ecgs === ILEGIVEL ? [] : (ecgs as any[])
      ),
      series: {
        sleepDuration: serie("sleepDuration"),
        restingHr: serie("restingHr"),
        hrv: serie("hrv"),
        spo2: serie("spo2"),
        steps: serie("steps"),
        /*
         * **Um ponto por dia, como a pressão duas linhas abaixo** (achado da 2ª
         * rodada do review). O `DailyCheckIn` tem até três linhas por dia —
         * manhã, tarde e noite —, e isto desenhava três pontos com o mesmo `x`.
         */
        pain: mediaPorDia((checkins as any[]).map((c) => ({ dia: c.checkinDate, valor: c.painLevel }))),
        mood: mediaPorDia((checkins as any[]).map((c) => ({ dia: c.checkinDate, valor: c.moodLevel }))),
        /**
         * **A pressão da clínica usa a mesma conta do papel** (achado do code
         * review, 120 T-3).
         *
         * Isto fazia `new Date(r.measuredAt).toISOString()` à mão — ou seja
         * UTC, e **uma leitura por ponto**. Três defeitos de uma vez:
         *
         * - uma leitura às 00:30 de Londres no verão caía em `D−1` aqui e em
         *   `D` no papel do paciente: o terapeuta e o paciente a ver dias
         *   diferentes da mesma medição, no item em que errar não é aceitável;
         * - um dia com três medições dava **três pontos com o mesmo `dia`**,
         *   que é exactamente o que o `pressaoPorDia` existe para impedir;
         * - não havia série diastólica nenhuma.
         *
         * `pressaoPorDia` é a função do papel. Uma segunda cópia da conta teria
         * o mesmo defeito que a primeira, mais tarde — a regra do Bruno é que o
         * que está no app está na clinic, e isso vale para a conta e não só
         * para a tela.
         */
        systolic: pressaoPorDia(pressao as any[], "systolic"),
        diastolic: pressaoPorDia(pressao as any[], "diastolic"),
      },
    });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[patients/monitoring] GET:", (err as Error)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
