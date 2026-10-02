import { prisma } from "@/lib/db";
import {
  withingsAccessToken,
  withingsBloodPressure,
  withingsActivity,
  withingsSleep,
  type WithingsBpReading,
} from "@/lib/withings";
import { ignoraPressao } from "@/lib/withings-routing";

/**
 * Writing Withings data into the models that already hold it.
 *
 * One place, because there are now two ways in: the scheduled sync the patient
 * or a cron triggers, and the webhook (T-9), which arrives seconds after a
 * measurement. Both must produce exactly the same rows — including the
 * deduplication — or the same reading lands twice with two different stories
 * about where it came from.
 *
 * Blood pressure does not go to WearableDataPoint: `BloodPressureReading` is
 * where the web, the clinician's view and the app all read it from, and a
 * reading is a reading whether a cuff or a person typed it.
 */

export interface WithingsConnection {
  id: string;
  userId: string;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  /** A cuff owned by the clinic, measuring many patients (T-14). */
  isClinicDevice?: boolean;
  clinicId?: string | null;
  /**
   * O id da conta **no provedor** — o mesmo dos dois lados quando um aparelho
   * serve à clínica e ao dono. É o que diz que ele é compartilhado (092 T-1).
   */
  providerUserId?: string | null;
}

/**
 * Stores the readings that are not already stored, and says how many were new.
 *
 * Deduplication is on Withings' own `grpid` when we have it, with the old
 * timestamp match kept for readings saved before T-9 added the column — those
 * have no id and would otherwise all come back as new on the next sync.
 */
/**
 * A mesma conta Withings também está ligada como aparelho da clínica?
 *
 * `providerUserId` é o id **da conta na Withings** — o mesmo dos dois lados, e
 * a única coisa que diz que são o mesmo aparelho. Sem ele não dá para saber, e
 * a resposta segura é `false`: uma conexão pessoal comum não deve parar de
 * gravar pressão por falta de dado.
 */
async function contaTambemEhDaClinica(connection: {
  providerUserId?: string | null;
}): Promise<boolean> {
  const id = connection.providerUserId;
  if (!id) return false;
  const daClinica = await (prisma as any).wearableConnection.findFirst({
    where: { provider: "WITHINGS", providerUserId: id, isClinicDevice: true },
    select: { id: true },
  });
  return !!daClinica;
}

export async function saveBloodPressure(
  patientId: string,
  clinicId: string | null,
  readings: WithingsBpReading[]
): Promise<number> {
  let saved = 0;
  for (const r of readings) {
    // Two ways a reading can already be here, and they are not interchangeable:
    // its own id, or — for rows saved before T-9 added the column — the same
    // timestamp *with no id*. Matching any row by timestamp would make a
    // reading the patient typed at the same minute swallow the device's.
    const exists = await (prisma as any).bloodPressureReading.findFirst({
      where: {
        patientId,
        OR: [
          ...(r.measureId ? [{ withingsMeasureId: r.measureId }] : []),
          { measuredAt: r.measuredAt, withingsMeasureId: null },
        ],
      },
      select: { id: true, withingsMeasureId: true },
    });
    if (exists) {
      // A row saved before this column existed gets its id filled in, so the
      // fallback match is needed once per reading and never again.
      if (!exists.withingsMeasureId && r.measureId) {
        await (prisma as any).bloodPressureReading.update({
          where: { id: exists.id },
          data: { withingsMeasureId: r.measureId },
        });
      }
      continue;
    }
    try {
      await (prisma as any).bloodPressureReading.create({
      data: {
        patientId,
        clinicId,
        systolic: r.systolic,
        diastolic: r.diastolic,
        heartRate: r.heartRate,
        method: "MANUAL",
        // The patient's own device, not something anyone typed (T-14, passo 7).
        // Without this the history showed a Withings reading from home as
        // "entered by hand", which is simply not what happened.
        source: "PATIENT_DEVICE",
        context: "HOME",
        measuredAt: r.measuredAt,
        notes: "Withings",
        withingsMeasureId: r.measureId,
      },
      });
    } catch (e: any) {
      // Webhook and scheduled sync can deliver the same measurement at the
      // same instant; the unique index catches the loser. A duplicate, not a
      // failure — and it must not abort the rest of the batch.
      if (e?.code === "P2002") continue;
      throw e;
    }
    saved++;

    // A reading that arrives while nobody is looking still has to reach the
    // clinic if it crosses a threshold. This path — the webhook and the
    // scheduled sync — alerted no one until now.
    const { afterBloodPressureRecorded } = await import("@/lib/bp-alerts");
    await afterBloodPressureRecorded({
      patientId,
      clinicId,
      systolic: r.systolic,
      diastolic: r.diastolic,
      measuredAt: r.measuredAt,
      via: "device",
    }).catch((e) => console.error("[withings-ingest] alert failed:", e?.message));
  }
  return saved;
}

/**
 * Quantos dias de minuto a minuto se busca por sincronização.
 *
 * **Três, e não trinta.** A API devolve 24 horas por chamada; trinta dias são
 * trinta chamadas por pessoa por rodada, e o limite deles é por minuto. O
 * período longo é servido pelo ponto diário, que já está lá — isto existe para
 * a pergunta *"o que aconteceu comigo hoje"*.
 */
const DIAS_DE_INTRADAY = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

/** `YYYY-MM-DD` no fuso local, que é o dia que a pessoa viveu. */
function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Guarda a série de um dia, substituindo a que lá estiver.
 *
 * Substitui em vez de acumular: a série de um dia é a melhor versão que a
 * Withings tem dele, e um dia que ainda está a decorrer melhora a cada
 * sincronização. Juntar as versões duplicaria os minutos.
 */
async function upsertSeries(
  userId: string,
  connectionId: string,
  kind: string,
  dataDate: string,
  pontos: unknown[]
) {
  const dados = {
    userId,
    connectionId,
    kind,
    dataDate,
    provider: "WITHINGS",
    series: JSON.stringify(pontos),
    pointCount: pontos.length,
  };
  await (prisma as any).wearableSeries.upsert({
    where: { connectionId_dataDate_kind: { connectionId, dataDate, kind } },
    create: dados,
    update: { series: dados.series, pointCount: dados.pointCount },
  });
}

async function upsertPoint(
  userId: string,
  connectionId: string,
  dataType: string,
  dataDate: string,
  fields: Record<string, unknown>
) {
  const existing = await (prisma as any).wearableDataPoint.findFirst({
    where: { userId, connectionId, dataDate, dataType },
    select: { id: true },
  });
  if (existing) {
    await (prisma as any).wearableDataPoint.update({ where: { id: existing.id }, data: fields });
  } else {
    await (prisma as any).wearableDataPoint.create({
      data: { userId, connectionId, dataDate, dataType, provider: "WITHINGS", ...fields },
    });
  }
}

/** Thirty days is what the patient's own screens show. */
export const WINDOW_DAYS = 30;

/**
 * A full pull: blood pressure, activity and sleep since `since`.
 *
 * `until` exists for the webhook, which is told the exact window a measurement
 * falls in and has no reason to re-read a month of history to find it.
 */
/**
 * O instante mais recente entre tudo que a Withings devolveu na janela.
 *
 * Vale a leitura que o aparelho da clínica mandou para a caixa de não
 * atribuídas: ela **é** dado chegando. Contá-la só quando cai num paciente
 * fazia a mesma tela listar as leituras e dizer "nada chega deste aparelho há
 * N dias" — uma contradição dentro de um cartão só.
 */
function newestMoment(
  bp: Array<{ measuredAt: Date | string }>,
  activity: Array<{ dataDate: Date | string }>,
  sleep: Array<{ dataDate: Date | string }>
): Date | null {
  let melhor: number | null = null;
  const considerar = (v: Date | string | undefined | null) => {
    if (!v) return;
    const t = (v instanceof Date ? v : new Date(v)).getTime();
    if (!Number.isNaN(t) && (melhor === null || t > melhor)) melhor = t;
  };
  for (const r of bp) considerar(r.measuredAt);
  for (const a of activity) considerar(a.dataDate);
  for (const n of sleep) considerar(n.dataDate);
  return melhor === null ? null : new Date(melhor);
}

export async function ingestWithings(
  userId: string,
  connection: WithingsConnection,
  opts: { since?: Date; until?: Date; kinds?: Array<"bp" | "activity" | "sleep" | "vitals" | "series"> } = {}
): Promise<{ bloodPressure: number; bloodPressureRead: number; activityDays: number; sleepNights: number; vitalsDays: number; ecgRecords: number; intradayDays: number; hypnogramNights: number; workouts: number }> {
  const token = await withingsAccessToken(connection);
  const since = opts.since ?? new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const kinds = opts.kinds ?? ["bp", "activity", "sleep", "vitals", "series"];
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } });

  // A clinic device measures patients, not its owner: steps and sleep from it
  // would be the staff member's, and blood pressure belongs to whoever the
  // open measurement session names. So it reads blood pressure only, and each
  // reading goes through attribution instead of straight into a record.
  const forClinic = connection.isClinicDevice === true;

  /**
   * A conexão pessoal de um aparelho **compartilhado** não processa pressão
   * (092 T-1).
   *
   * O Bruno usa um medidor só nos dois papéis, então a mesma conta Withings
   * está ligada a nós duas vezes. O webhook escolhia uma delas por sorteio — e
   * isso já foi corrigido —, mas **a varredura diária itera todas**, e a
   * pessoal salvava no prontuário do dono **todas** as leituras da janela,
   * inclusive as medidas em pacientes. Ainda disparava os alertas delas como
   * se fossem dele: o 210/130 de um paciente chegando como se fosse do dono.
   *
   * Isto já acontecia antes da 092; o sorteio do webhook só escondia metade.
   * Achado do review de 27/09/2026.
   *
   * Num aparelho compartilhado só a conexão da clínica sabe perguntar de quem
   * é a leitura — é ela que enxerga as janelas de medição. Então ela é a
   * autoridade, e a pessoal se cala **para pressão**. Passos e sono continuam,
   * porque esses são de quem carrega o aparelho, não de quem foi medido.
   */
  const pulaPressaoDaClinica = ignoraPressao({
    ehDaClinica: forClinic,
    contaTambemEhDaClinica: await contaTambemEhDaClinica(connection),
  });

  const wanted: Array<"bp" | "activity" | "sleep" | "vitals" | "series"> = forClinic
    ? ["bp"]
    : pulaPressaoDaClinica
      ? kinds.filter((k) => k !== "bp")
      : kinds;

  const [bp, activity, sleep] = await Promise.all([
    wanted.includes("bp") ? withingsBloodPressure(token, since, opts.until) : Promise.resolve([]),
    wanted.includes("activity") ? withingsActivity(token, since) : Promise.resolve([]),
    wanted.includes("sleep") ? withingsSleep(token, since) : Promise.resolve([]),
  ]);

  let bpSaved = 0;
  if (forClinic) {
    const { attributeClinicReading } = await import("@/lib/clinic-device");
    for (const reading of bp) {
      const outcome = await attributeClinicReading(
        // A atribuição recebe a conexão, não a conta: quem olha o
        // `providerUserId` é `ignoraPressao`, acima, e já decidiu. Passar o id
        // da conta adiante foi o que sustentou o atalho "sem sessão vai para o
        // dono", derrubado no review de 27/09/2026.
        { id: connection.id, clinicId: connection.clinicId ?? null, isClinicDevice: true },
        reading
      );
      // O dono tambem conta como salva: a leitura entrou num prontuario. Sem
      // esta linha, a varredura diria "nenhuma leitura chegou" num dia em que
      // todas chegaram — e e por esse numero que se julga se o cano funciona.
      if (outcome.kind === "assigned" || outcome.kind === "owner") bpSaved++;
      if (outcome.kind === "unassigned") {
        console.log(`[withings-ingest] unassigned reading (${outcome.reason}) id=${outcome.id}`);
      }
    }
  } else {
    bpSaved = await saveBloodPressure(userId, me?.clinicId ?? null, bp);
  }

  for (const a of activity) {
    await upsertPoint(userId, connection.id, "ACTIVITY", a.dataDate, {
      steps: a.steps,
      activeCalories: a.activeCalories,
      totalCalories: a.totalCalories,
      activeMinutes: a.activeMinutes,
    });
  }
  // SpO2, temperature and heart rate (activity 074, T-8). One row per day,
  // like everything else the screens draw. A metric the account does not have
  // stays absent — `upsertPoint` writes only the fields it is given, so a day
  // with SpO2 and no temperature does not overwrite anything with a zero.
  let vitalsDays = 0;
  let ecgRecords = 0;
  /**
   * As séries do dia e da noite (099 T-7).
   *
   * **A janela do intraday é curta de propósito.** A API devolve 24 horas por
   * chamada: noventa dias seriam noventa chamadas por pessoa, e o limite deles
   * é por minuto. O período longo continua a ser servido pelo ponto diário; o
   * minuto a minuto existe para a pergunta *"o que aconteceu comigo hoje"*, e
   * essa pergunta não é sobre Abril.
   */
  let intradayDays = 0;
  let hypnogramNights = 0;
  let workouts = 0;

  if (wanted.includes("series")) {
    try {
      const { intradayDoDia, hipnogramaDaNoite, treinosDoPeriodo } = await import("@/lib/withings-series");

      const fim = opts.until ?? new Date();
      const diasDeIntraday = Math.min(DIAS_DE_INTRADAY, Math.ceil((fim.getTime() - since.getTime()) / DAY_MS) || 1);

      for (let i = 0; i < diasDeIntraday; i++) {
        const dia = new Date(fim);
        dia.setDate(dia.getDate() - i);
        const inicioDoDia = new Date(dia);
        inicioDoDia.setHours(0, 0, 0, 0);
        const fimDoDia = new Date(dia);
        fimDoDia.setHours(23, 59, 59, 999);

        /*
         * **Cada chamada falha sozinha.**
         *
         * Antes as três partilhavam um `try`, e em 01/10 um campo inválido no
         * pedido do sono (`data_fields [spo2]`) derrubou o bloco inteiro: o
         * intraday e os treinos nem chegaram a ser tentados. Um parâmetro
         * errado custou três funcionalidades, e o log só falava de um.
         *
         * Agora o que falha é o que falha, e diz qual foi.
         */
        try {
          const pontos = await intradayDoDia(token, inicioDoDia, fimDoDia);
          if (pontos.length > 0) {
            await upsertSeries(userId, connection.id, "INTRADAY", ymd(inicioDoDia), pontos);
            intradayDays++;
          }
        } catch (e: any) {
          console.warn(`[withings-ingest] intraday de ${ymd(inicioDoDia)}: ${e?.message ?? e}`);
        }

        try {
          const noite = await hipnogramaDaNoite(token, inicioDoDia, fimDoDia);
          if (noite.length > 0) {
            await upsertSeries(userId, connection.id, "HYPNOGRAM", ymd(inicioDoDia), noite);
            hypnogramNights++;
          }
        } catch (e: any) {
          console.warn(`[withings-ingest] hipnograma de ${ymd(inicioDoDia)}: ${e?.message ?? e}`);
        }
      }

      const treinos = await treinosDoPeriodo(token, since, fim).catch((e: any) => {
        console.warn(`[withings-ingest] treinos: ${e?.message ?? e}`);
        return [] as Awaited<ReturnType<typeof treinosDoPeriodo>>;
      });
      workouts = treinos.length;
      if (treinos.length > 0) {
        /*
         * Os treinos são poucos e atravessam dias; guardam-se como uma série do
         * período, na data do fim, em vez de um registo por treino. Quando
         * forem muitos, a tabela certa é outra.
         */
        await upsertSeries(userId, connection.id, "WORKOUTS", ymd(fim), treinos);
      }
    } catch (e: any) {
      console.warn(`[withings-ingest] séries falharam: ${e?.message ?? e}`);
    }
  }

  if (wanted.includes("vitals")) {
    try {
      const { withingsVitals, vitalsByDay, withingsEcg } = await import("@/lib/withings-vitals");
      const vitals = await withingsVitals(token, since, opts.until);

      /*
       * **O que o aparelho manda e nós ainda não sabemos nomear.**
       *
       * A chamada passou a pedir todos os tipos de medida em vez de quatro
       * escolhidos (099 T-7). Um tipo que não pedíamos não vinha, e a API não
       * dava erro nenhum — devolvia menos, em silêncio. Isto imprime os números
       * que chegaram sem nome, que é como se descobre o que um ScanWatch 2
       * produz de facto: os intervalos de ECG e a fibrilhação por PPG vêm por
       * aqui, e os números deles são recentes demais para estarem nos clientes
       * abertos que consultei.
       *
       * É diagnóstico de desenvolvimento, não dado de paciente: só o número do
       * tipo e quantas vezes apareceu.
       */
      const contagemPorTipo: Record<string, number> = {};
      for (const v of vitals) {
        for (const tipo of Object.keys(v.naoNomeados ?? {})) {
          contagemPorTipo[tipo] = (contagemPorTipo[tipo] ?? 0) + 1;
        }
      }
      if (Object.keys(contagemPorTipo).length) {
        console.log(
          `[withings-ingest] tipos de medida sem nome: ${Object.entries(contagemPorTipo)
            .map(([tipo, n]) => `${tipo}×${n}`)
            .join(", ")}`
        );
      }
      for (const day of vitalsByDay(vitals)) {
        const fields: Record<string, unknown> = { rawPayload: JSON.stringify({ samples: day.samples }) };
        if (day.spo2 !== undefined) fields.spo2 = day.spo2;
        if (day.bodyTemperature !== undefined) fields.bodyTemperature = day.bodyTemperature;
        // Não há coluna para temperatura de pele, e ela não é temperatura
        // corporal — vai para o payload em vez de ser pedida e jogada fora.
        if (day.skinTemperature !== undefined) {
          fields.rawPayload = JSON.stringify({ samples: day.samples, skinTemperature: day.skinTemperature });
        }
        if (day.restingHr !== undefined) fields.restingHr = day.restingHr;
        await upsertPoint(userId, connection.id, "VITALS", day.dataDate, fields);
        vitalsDays++;
      }

      /*
       * The fact that an ECG happened and what the device concluded — never the
       * trace, and never our reading of it.
       *
       * **Uma linha por gravação** (119 T-2). Até 02/10/2026 isto escrevia no
       * `WearableDataPoint`, cuja chave é `(utilizador, dia, tipo)` — a chave de
       * um **total do dia**. Um ECG é um evento: o Bruno gravou dois em 01/10,
       * às 22:44 e 23:54, e o segundo apagou o primeiro em silêncio. Não ficava
       * buraco nenhum na tela, ficava um registo plausível.
       *
       * E o dia vinha de `recordedAt.toISOString()`, ou seja **UTC**: um ECG às
       * 00:30 em Londres no verão era guardado como do dia anterior. Agora
       * guarda-se o instante, e quem mostra agrupa no seu próprio fuso.
       */
      const ecg = await withingsEcg(token, since, opts.until);
      let sinalTentado = false;
      for (const rec of ecg) {
        const dataDate = rec.recordedAt.toISOString().split("T")[0];
        const { traduzirClassificacao } = await import("@/lib/ecg-record");
        const afibRaw =
          typeof rec.afibClassification === "number"
            ? rec.afibClassification
            : rec.afibClassification == null
              ? null
              : Number(rec.afibClassification);

        await prisma.ecgRecording.upsert({
          where: {
            userId_provider_recordedAt: {
              userId,
              provider: "withings",
              recordedAt: rec.recordedAt,
            },
          },
          create: {
            userId,
            connectionId: connection.id,
            provider: "withings",
            recordedAt: rec.recordedAt,
            heartRate: rec.heartRate ?? null,
            afibRaw: Number.isFinite(afibRaw as number) ? (afibRaw as number) : null,
            conclusao: traduzirClassificacao(rec.afibClassification),
            signalId: rec.signalId,
          },
          update: {
            connectionId: connection.id,
            heartRate: rec.heartRate ?? null,
            afibRaw: Number.isFinite(afibRaw as number) ? (afibRaw as number) : null,
            /*
             * A conclusão é recalculada a cada sincronização de propósito: se a
             * tabela de tradução estiver errada — e esteve, até 02/10 —, a
             * correção alcança os registos antigos sem migração nenhuma. É para
             * isso que o `afibRaw` fica guardado por inteiro.
             */
            conclusao: traduzirClassificacao(rec.afibClassification),
            signalId: rec.signalId,
          },
        });
        ecgRecords++;

        /*
         * **O traçado — e, antes disso, a medição.** (099 T-9)
         *
         * A lista dá a conclusão e um `signalid`; as amostras são uma segunda
         * chamada que nunca fizemos. E não dá para saber pela documentação se o
         * nosso plano a inclui: a divisão publicada põe o sinal no escalão
         * pago, e **dado fora do plano não dá erro** — o campo só não vem.
         *
         * Então o log distingue os três desfechos, porque "vazio" e "sem
         * direito" são a mesma resposta e levam a ações opostas. Só o registo
         * **mais recente** é buscado: a pergunta é se dá, não encher o banco.
         */
        if (rec.signalId && !sinalTentado) {
          sinalTentado = true;
          try {
            const { sinalDoEcg } = await import("@/lib/withings-series");
            const sinal = await sinalDoEcg(token, rec.signalId);
            if (sinal.amostras.length > 0) {
              await upsertSeries(userId, connection.id, "ECG_SIGNAL", dataDate, sinal.amostras);
              console.log(
                `[withings-ingest] ECG: ${sinal.amostras.length} amostras a ${sinal.frequencia ?? "?"} Hz — O PLANO INCLUI`
              );
            } else {
              console.log(
                `[withings-ingest] ECG: VAZIO SEM ERRO (ambiguo — tratar como NAO LIDO). ` +
                  `chaves do corpo: ${Object.keys(sinal.bruto).join(",") || "nenhuma"}`
              );
            }
          } catch (e: any) {
            console.log(`[withings-ingest] ECG: ERRO EXPLICITO — ${e?.message ?? e}`);
          }
        }
      }
    } catch (e: any) {
      // An account without these metrics must not cost the patient their blood
      // pressure, sleep and activity, which are already saved by this point.
      console.error("[withings-ingest] vitals failed:", e?.message);
    }
  }

  for (const n of sleep) {
    await upsertPoint(userId, connection.id, "SLEEP", n.dataDate, {
      sleepDuration: n.sleepDuration,
      deepMinutes: n.deepMinutes,
      remMinutes: n.remMinutes,
      lightMinutes: n.lightMinutes,
      awakeMinutes: n.awakeMinutes,
      hrv: n.hrv,
      restingHr: n.restingHr,
    });
  }

  // O carimbo de "chegou dado" mora aqui, e não em cada chamador: são três
  // (webhook, cron e o botão do paciente) e dois deles carimbavam enquanto o
  // terceiro não — quem sincronizasse pelo botão recebia o dado e continuava
  // marcado como mudo (achado do code review da T-11).
  //
  // E a data é a da **leitura mais nova**, não `agora`. Com `agora`, a janela
  // do cron olha alguns dias para trás, então um aparelho que parou ontem
  // continuaria devolvendo as medidas de antes por mais três ou quatro
  // rodadas — e cada uma delas empurraria o relógio do silêncio para a frente.
  // O silêncio nunca seria detectado no prazo. A data da medida não mente.
  const latestAt = newestMoment(bp, activity, sleep);
  await (prisma as any).wearableConnection.update({
    where: { id: connection.id },
    data: {
      lastSyncedAt: new Date(),
      status: "CONNECTED",
      ...(latestAt ? { lastReadingAt: latestAt } : {}),
    },
  });

  return {
    bloodPressure: bpSaved,
    // Quantas a Withings devolveu nesta janela, salvas ou nao. "Veio uma e
    // foi para a caixa" e "nao veio nada" sao noticias opostas, e sem este
    // numero a tela dizia a segunda nos dois casos (092, review de 27/09).
    bloodPressureRead: bp.length,
    activityDays: activity.length,
    sleepNights: sleep.length,
    vitalsDays,
    intradayDays,
    hypnogramNights,
    workouts,
    ecgRecords,
  };
}
