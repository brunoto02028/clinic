/**
 * The Withings measurements beyond blood pressure (activity 074, T-8).
 *
 * The commercial plan sells three tiers, and what separates the £79 one is
 * exactly this list: SpO2, HRV, temperature, intraday heart rate, ECG. The
 * plan's checklist marks it done; it was not. Activity 070 brought blood
 * pressure, sleep and activity, and nothing else.
 *
 * SpO2, temperature and heart rate come from `getmeas` — the same call and the
 * same value/unit shape as blood pressure, which is already proven in
 * production. ECG comes from `v2/heart`, which this code has never seen a real
 * response from: it is read defensively and the whole payload is kept, so the
 * day a real account is connected the mapping can be corrected against
 * something real instead of against my guess.
 *
 * Nothing here invents a number. A metric the account does not have comes back
 * absent, not zero — a wearable screen showing "SpO2 0%" would be a
 * measurement that never happened.
 */

import { diaNoFuso } from "@/lib/dia-da-medicao";
import { withingsRawCall } from "@/lib/withings";

/**
 * Os tipos de medida da Withings, do `getmeas` deles.
 *
 * **Esta lista é o que sabemos ler, não o que pedimos.** Pedir só estes quatro
 * era o defeito: um tipo que não está aqui simplesmente não vem, e a API **não
 * dá erro** — devolve menos, em silêncio. Foi assim que o VO2 máx, a frequência
 * respiratória e os intervalos de ECG ficaram de fora sem ninguém reparar.
 *
 * Agora a chamada pede **tudo** (sem o parâmetro `meastypes`) e esta tabela
 * serve só para dar nome ao que chega. O que chegar e não estiver aqui é
 * contado em `tiposDesconhecidos` — que é como se descobre o que o aparelho de
 * facto produz, em vez de se adivinhar pelo número na documentação.
 */
export const MEASTYPE = {
  HEART_RATE: 11,
  TEMPERATURE: 12,
  SPO2: 54,
  BODY_TEMPERATURE: 71,
  SKIN_TEMPERATURE: 73,
  /** ml/min/kg. Confirmado na documentação deles e em clientes mantidos. */
  VO2_MAX: 123,
} as const;

export interface WithingsVital {
  measuredAt: Date;
  /**
   * O fuso em que a medição foi feita, como a Withings o manda.
   *
   * Existe porque o dia de uma medição é o dia **de quem mediu**, e não o dia em
   * UTC: o `getactivity` e o `getsummary` do sono já datam assim, e usar UTC só
   * aqui fazia a mesma noite cair em dias diferentes conforme o balde.
   */
  timezone?: string | null;
  /** Withings' `grpid`, or null when they did not send one. */
  measureId: string | null;
  heartRate?: number;
  temperature?: number;
  spo2?: number;
  bodyTemperature?: number;
  skinTemperature?: number;
  vo2Max?: number;
  /**
   * Os valores que chegaram com um tipo que ainda não sabemos nomear.
   *
   * Guardados pelo número, para a primeira sincronização real dizer o que o
   * relógio produz. Um ScanWatch 2 manda intervalos de ECG e fibrilhação por
   * PPG como tipos de medida, e os números deles são recentes demais para
   * estarem nos clientes abertos que consultei.
   */
  naoNomeados?: Record<number, number>;
}

/**
 * One entry per measure group, with only the values that group actually
 * carried. A group is skipped when it carried none of them.
 */
export async function withingsVitals(
  accessToken: string,
  since: Date,
  until?: Date
): Promise<WithingsVital[]> {
  const body = await withingsRawCall("/measure", {
    action: "getmeas",
    access_token: accessToken,
    category: "1", // real measurements, not user objectives
    startdate: String(Math.floor(since.getTime() / 1000)),
    enddate: String(Math.floor((until ?? new Date()).getTime() / 1000)),
  });

  const out: WithingsVital[] = [];
  for (const group of body?.measuregrps ?? []) {
    const val = (type: number): number | undefined => {
      const m = (group.measures ?? []).find((x: any) => x.type === type);
      if (!m) return undefined;
      const n = m.value * Math.pow(10, m.unit);
      return Number.isFinite(n) ? n : undefined;
    };

    const conhecidos = new Set<number>(Object.values(MEASTYPE));
    const naoNomeados: Record<number, number> = {};
    for (const m of group.measures ?? []) {
      if (typeof m?.type === "number" && !conhecidos.has(m.type)) {
        const n = m.value * Math.pow(10, m.unit);
        if (Number.isFinite(n)) naoNomeados[m.type] = n;
      }
    }

    const vital: WithingsVital = {
      measuredAt: new Date(Number(group.date) * 1000),
      timezone: typeof group.timezone === "string" ? group.timezone : null,
      measureId: group.grpid != null ? String(group.grpid) : null,
      heartRate: val(MEASTYPE.HEART_RATE),
      temperature: val(MEASTYPE.TEMPERATURE),
      spo2: val(MEASTYPE.SPO2),
      bodyTemperature: val(MEASTYPE.BODY_TEMPERATURE),
      skinTemperature: val(MEASTYPE.SKIN_TEMPERATURE),
      vo2Max: val(MEASTYPE.VO2_MAX),
      ...(Object.keys(naoNomeados).length ? { naoNomeados } : {}),
    };

    /*
     * Um grupo entra se trouxe **alguma coisa** — inclusive um tipo que ainda
     * não sabemos nomear. Descartá-lo por não reconhecer os seus números era
     * garantir que nunca descobriríamos que ele existe.
     */
    const trouxeAlgo =
      vital.heartRate !== undefined ||
      vital.temperature !== undefined ||
      vital.spo2 !== undefined ||
      vital.bodyTemperature !== undefined ||
      vital.skinTemperature !== undefined ||
      vital.vo2Max !== undefined ||
      vital.naoNomeados !== undefined;
    if (trouxeAlgo) out.push(vital);
  }
  return out;
}

export interface WithingsEcgRecord {
  recordedAt: Date;
  /** Their classification, untouched. We do not interpret a trace. */
  afibClassification: string | number | null;
  heartRate: number | null;
  signalId: string | null;
  /**
   * **Qual aparelho gravou** (122 T-1).
   *
   * O `v2/heart list` manda `deviceid` e `model` em cada registo, e é isso que
   * torna possível o que o Bruno pediu: *"o relógio cai em mim sempre. O BeamO
   * pode ir tanto pra mim quanto para o paciente, eu escolho na hora de usar."*
   *
   * Sem isto, a única coisa que distinguia uma medição dele de uma medição num
   * paciente era **o instante** — e um ECG do relógio dele gravado durante uma
   * janela de medição seria desviado para o paciente. O relógio está no pulso
   * dele; não há instante que o torne de outra pessoa.
   */
  deviceId: string | null;
  deviceModel: number | null;
  /** The whole entry, because the mapping above is not verified yet. */
  raw: unknown;
}

/**
 * ECG recordings, as a fact that one happened and what the device concluded.
 *
 * Never the trace itself, and never our own reading of it: a physiotherapy
 * product that interprets an ECG is a different, regulated product (the
 * commercial plan is explicit about the MHRA line).
 *
 * Returns an empty list when the account has no ECG capability or the scope
 * does not cover it — absence is not an error here.
 */
export async function withingsEcg(
  accessToken: string,
  since: Date,
  until?: Date
): Promise<WithingsEcgRecord[]> {
  let body: any;
  try {
    body = await withingsRawCall("/v2/heart", {
      action: "list",
      access_token: accessToken,
      startdate: String(Math.floor(since.getTime() / 1000)),
      enddate: String(Math.floor((until ?? new Date()).getTime() / 1000)),
    });
  } catch (e: any) {
    /*
     * **Nem todo erro é "este paciente não tem ECG".**
     *
     * Isto engolia *qualquer* falha e devolvia lista vazia: um 429 por termos
     * passado do limite, um token expirado, uma avaria deles — tudo chegava à
     * tela como *"ainda sem registos"*, que é a frase que descreve um paciente
     * que nunca gravou um ECG. Duas situações opostas com a mesma resposta, e a
     * errada é a que não leva ninguém a investigar.
     *
     * E a ausência verdadeira **não vem por erro**: uma conta sem ECG responde
     * `status: 0` com `series` vazia. É por isso que engolir aqui nunca serviu
     * para o caso que o comentário antigo invocava.
     *
     * O limite publicado é de 120 pedidos por minuto por `client_id` — com
     * vários pacientes a sincronizar ao mesmo tempo, o 601 é a falha mais
     * provável desta chamada, e era exactamente a que desaparecia.
     */
    const msg = String(e?.message ?? e);
    console.error("[withings-vitals] ECG list failed:", msg);
    throw e;
  }

  const series = body?.series ?? [];
  return series.map((s: any) => ({
    recordedAt: new Date(Number(s?.timestamp ?? s?.date ?? 0) * 1000),
    afibClassification: s?.ecg?.afib ?? s?.afib ?? null,
    heartRate: typeof s?.heart_rate === "number" ? s.heart_rate : null,
    signalId: s?.ecg?.signalid != null ? String(s.ecg.signalid) : null,
    deviceId: s?.deviceid != null ? String(s.deviceid) : null,
    deviceModel: typeof s?.model === "number" ? s.model : null,
    raw: s,
  }));
}

/** The daily shape the wearable screens read, built from a day's groups. */
export interface VitalsDay {
  dataDate: string;
  spo2?: number;
  bodyTemperature?: number;
  /** Wrist/skin temperature, which is not body temperature and never replaces it. */
  skinTemperature?: number;
  restingHr?: number;
  /**
   * How many measurements contributed a value the day actually uses.
   *
   * QA caught this counting groups that carried nothing but a skin
   * temperature, which was then discarded — the row said "from three
   * measurements" when two of them contributed nothing to it.
   */
  samples: number;
}

/**
 * One row per day, because `WearableDataPoint` is keyed by day and that is
 * what the screens draw.
 *
 * The daily value is the average of that day's measurements, and `samples`
 * says how many — a single reading and twenty readings are not the same claim,
 * and the screen should be able to tell them apart. Resting heart rate is the
 * day's **minimum**, not its mean: the mean of a day's heart rates is not a
 * resting rate by any definition.
 */
/**
 * O dia em que a medição aconteceu, **no fuso de quem mediu**.
 *
 * A Withings manda o fuso com os grupos de medidas (`timezone`), e é o mesmo que
 * ela usa para datar a actividade e o sono. Usar UTC aqui e o fuso deles ali faz
 * a mesma noite cair em dias diferentes conforme o balde.
 */
/*
 * A conta mudou de casa, para a pressão a alcançar: `lib/dia-da-medicao.ts`.
 * Enquanto ela vivia aqui, o `patient-monitoring` não a podia usar — e a
 * pressão ficou a única série em UTC (120 T-3).
 */
function diaDaMedicao(v: { measuredAt: Date; timezone?: string | null }): string {
  return diaNoFuso(v.measuredAt, v.timezone) ?? v.measuredAt.toISOString().split("T")[0];
}

export function vitalsByDay(vitals: WithingsVital[]): VitalsDay[] {
  const days = new Map<string, WithingsVital[]>();
  for (const v of vitals) {
    /*
     * **O dia da medição, e não o dia em UTC** (achado do QA comparativo).
     *
     * Isto era `toISOString()`, ou seja UTC, enquanto o `ACTIVITY` e o `SLEEP`
     * usam o campo `date` da Withings, que vem no fuso de quem mediu. Em Outubro
     * Londres está em BST: uma medição entre as 00:00 e a 01:00 caía no **dia
     * anterior** no `VITALS` e no dia certo nos outros.
     *
     * Consequência: a mesma noite podia produzir `SLEEP` no dia D e `VITALS` em
     * D−1, e a garantia de que um dia conta uma vez só — que o `onde-mora` e as
     * barras assumem — deixava de valer.
     *
     * O fuso vem com a medição quando a Withings o manda; sem ele, UTC, como
     * antes, e aí o erro é o que já era.
     */
    const key = diaDaMedicao(v);
    const list = days.get(key);
    if (list) list.push(v);
    else days.set(key, [v]);
  }

  const mean = (values: number[]) =>
    values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined;

  return [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dataDate, list]) => {
      const spo2 = mean(list.map((v) => v.spo2).filter((n): n is number => n !== undefined));
      const temps = list.map((v) => v.bodyTemperature).filter((n): n is number => n !== undefined);
      const skin = list.map((v) => v.skinTemperature).filter((n): n is number => n !== undefined);
      const hrs = list.map((v) => v.heartRate).filter((n): n is number => n !== undefined);
      const contributed = list.filter(
        (v) =>
          v.spo2 !== undefined ||
          v.bodyTemperature !== undefined ||
          v.skinTemperature !== undefined ||
          v.heartRate !== undefined
      ).length;
      return {
        dataDate,
        spo2: spo2 !== undefined ? Math.round(spo2 * 10) / 10 : undefined,
        bodyTemperature: temps.length ? Math.round((mean(temps) as number) * 10) / 10 : undefined,
        skinTemperature: skin.length ? Math.round((mean(skin) as number) * 10) / 10 : undefined,
        restingHr: hrs.length ? Math.min(...hrs) : undefined,
        samples: contributed,
      };
    });
}
