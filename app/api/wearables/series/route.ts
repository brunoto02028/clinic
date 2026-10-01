export const dynamic = "force-dynamic";

/**
 * As séries do dia e da noite, para a tela do paciente (099 T-8).
 *
 * A rota vizinha, `/api/wearables/data`, devolve **um ponto por dia** — o total
 * de passos, a média da frequência. Serve para a tendência de 90 dias e não
 * responde *"o que aconteceu comigo hoje"*, que precisa da hora.
 *
 * Aqui devolve-se a série guardada em `WearableSeries`: o dia minuto a minuto,
 * a noite trecho a trecho, e os treinos.
 *
 * ## Agrega antes de mandar
 *
 * O intraday tem até **1440 pontos por dia**. Mandá-los todos para o telemóvel
 * é meio megabyte por dia para desenhar num gráfico de trezentos pixels, e a
 * tela ficaria lenta pelo dado que não cabe no ecrã. A agregação acontece aqui
 * — e o intervalo usado vai na resposta, porque esconder a resolução é uma
 * forma de mentir sobre a precisão.
 */

import { patientGate } from "@/lib/patient-gate";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { agruparPorIntervalo, PontoIntraday } from "@/lib/withings-series";

/** Os tipos de série que esta rota serve. */
const TIPOS = ["INTRADAY", "HYPNOGRAM", "WORKOUTS"] as const;
type Tipo = (typeof TIPOS)[number];

/**
 * Quantos minutos cada barra do gráfico do dia cobre.
 *
 * Cinco minutos dão 288 pontos num dia — o suficiente para a forma do dia
 * aparecer e pouco o bastante para caber num telemóvel.
 */
const MINUTOS_POR_BALDE = 5;

export async function GET(request: NextRequest) {
  const __gate = await patientGate({ module: "mod_devices" });
  if (__gate.response) return __gate.response;

  const eff = await getEffectiveUser();
  if (!eff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const kindParam = (request.nextUrl.searchParams.get("kind") || "INTRADAY").toUpperCase();
  if (!TIPOS.includes(kindParam as Tipo)) {
    return NextResponse.json(
      { error: "unknown_kind", accepted: TIPOS },
      { status: 400 }
    );
  }
  const kind = kindParam as Tipo;

  /**
   * A data pedida, ou o dia mais recente que existe.
   *
   * **Sem este `?? mais recente`, abrir a tela às 00h05 mostraria um dia
   * vazio** — o de hoje, que ainda não foi sincronizado — e a pessoa concluiria
   * que o relógio parou.
   */
  const dataPedida = request.nextUrl.searchParams.get("date");

  const serie = await (prisma as any).wearableSeries.findFirst({
    where: {
      userId: eff.userId,
      kind,
      ...(dataPedida ? { dataDate: dataPedida } : {}),
    },
    orderBy: { dataDate: "desc" },
    select: { dataDate: true, series: true, pointCount: true, provider: true, updatedAt: true },
  });

  if (!serie) {
    /*
     * Vazio **com a razão**: não ter série de um dia e não ter aparelho ligado
     * levam a telas diferentes, e a tela não consegue distinguir sozinha.
     */
    const temLigacao = await (prisma as any).wearableConnection.count({
      where: { userId: eff.userId, status: { not: "DISCONNECTED" } },
    });
    return NextResponse.json({
      kind,
      dataDate: dataPedida,
      points: [],
      pointCount: 0,
      hasConnection: temLigacao > 0,
      reason: temLigacao > 0 ? "no_series_for_day" : "no_connection",
    });
  }

  let pontos: unknown[];
  try {
    pontos = JSON.parse(serie.series);
  } catch {
    // Uma série ilegível é um defeito nosso, não um dia sem dado — e dizer
    // "sem dado" aqui esconderia o defeito atrás de uma tela plausível.
    return NextResponse.json(
      { error: "unreadable_series", kind, dataDate: serie.dataDate },
      { status: 500 }
    );
  }

  if (kind === "INTRADAY") {
    const agregado = agruparPorIntervalo(pontos as PontoIntraday[], MINUTOS_POR_BALDE);
    return NextResponse.json({
      kind,
      dataDate: serie.dataDate,
      provider: serie.provider,
      updatedAt: serie.updatedAt,
      /** Dito de propósito: a tela mostra 5 minutos, o dado é por minuto. */
      bucketMinutes: MINUTOS_POR_BALDE,
      rawPointCount: serie.pointCount,
      points: agregado,
      pointCount: agregado.length,
      hasConnection: true,
    });
  }

  // O hipnograma e os treinos já são poucos trechos: vão inteiros.
  return NextResponse.json({
    kind,
    dataDate: serie.dataDate,
    provider: serie.provider,
    updatedAt: serie.updatedAt,
    points: pontos,
    pointCount: Array.isArray(pontos) ? pontos.length : 0,
    hasConnection: true,
  });
}
