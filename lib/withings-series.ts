/**
 * As séries do dia e da noite (099 T-7).
 *
 * O que já tínhamos da Withings era **um ponto por dia**: o total de passos, a
 * média da frequência, a duração do sono. Isso responde *"como tem andado"* e
 * não responde *"o que aconteceu comigo hoje"* — que é a pergunta que o app
 * deles abre primeiro, e a que o Bruno pediu: *"com todas as informações e
 * horas e minutos"*.
 *
 * Três chamadas, três formatos:
 *
 * | | endpoint | o que devolve |
 * |---|---|---|
 * | o dia | `v2/measure getintradayactivity` | passos e frequência ao longo do dia |
 * | a noite | `v2/sleep get` | as fases, minuto a minuto |
 * | os treinos | `v2/measure getworkouts` | sessões, com duração e intensidade |
 *
 * ## O que foi escrito contra documentação, e ainda não contra resposta real
 *
 * Os nomes de campo aqui saem da documentação deles. **Nenhum destes três
 * caminhos viu ainda uma resposta verdadeira** — é a mesma situação do cliente
 * da LML, que errava host e caminho por ter sido escrito no escuro. Por isso
 * cada função é tolerante: um campo que não venha com o nome esperado vira
 * ausência, não exceção, e o que não se reconhece é contado em vez de
 * descartado — para a primeira sincronização real dizer o que de facto chega.
 */
import { withingsRawCall } from "@/lib/withings";

/** Um instante da série do dia. `t` é epoch em segundos. */
export interface PontoIntraday {
  t: number;
  /** Passos naquele intervalo, quando o aparelho os contou. */
  steps?: number;
  /** Frequência cardíaca naquele instante. */
  hr?: number;
  /** Calorias do intervalo. */
  calories?: number;
  /** Distância, em metros. */
  distance?: number;
}

/**
 * A série do dia, minuto a minuto.
 *
 * **A API devolve no máximo 24 horas por chamada.** Pedir uma semana numa
 * chamada não dá erro — devolve o recorte, e quem lê fica a achar que a semana
 * veio. Por isso esta função é por dia, e quem quiser vários dias chama várias
 * vezes, de propósito e contando as chamadas.
 */
export async function intradayDoDia(
  accessToken: string,
  inicio: Date,
  fim: Date
): Promise<PontoIntraday[]> {
  const body = await withingsRawCall("/v2/measure", {
    action: "getintradayactivity",
    access_token: accessToken,
    startdate: String(Math.floor(inicio.getTime() / 1000)),
    enddate: String(Math.floor(fim.getTime() / 1000)),
    data_fields: "steps,heart_rate,calories,distance",
  });

  /*
   * O formato deles é um objeto com o instante como **chave**, não uma lista:
   * `{ "1790000000": { steps: 12, heart_rate: 71 }, ... }`. Tratá-lo como lista
   * devolve vazio sem erro nenhum.
   */
  const series = body?.series ?? {};
  const pontos: PontoIntraday[] = [];
  for (const [chave, v] of Object.entries<any>(series)) {
    const t = Number(chave);
    if (!Number.isFinite(t)) continue;
    const p: PontoIntraday = { t };
    if (typeof v?.steps === "number") p.steps = v.steps;
    if (typeof v?.heart_rate === "number") p.hr = v.heart_rate;
    if (typeof v?.calories === "number") p.calories = v.calories;
    if (typeof v?.distance === "number") p.distance = v.distance;
    if (p.steps !== undefined || p.hr !== undefined || p.calories !== undefined || p.distance !== undefined) {
      pontos.push(p);
    }
  }
  pontos.sort((a, b) => a.t - b.t);
  return pontos;
}

/**
 * As fases do sono: 0 acordado, 1 leve, 2 profundo, 3 REM.
 *
 * São os códigos da Withings, e ficam como números de propósito — traduzi-los
 * aqui esconderia um código novo atrás de um nome errado.
 */
export const FASE_DO_SONO = { ACORDADO: 0, LEVE: 1, PROFUNDO: 2, REM: 3 } as const;

export interface TrechoDeSono {
  /** Epoch em segundos. */
  inicio: number;
  fim: number;
  /** O código da fase, como a Withings o manda. */
  fase: number;
  /** Frequência cardíaca média do trecho, quando veio. */
  hr?: number;
  /** Frequência respiratória média do trecho, quando veio. */
  rr?: number;
  /** SpO2 médio do trecho, quando veio. */
  spo2?: number;
}

/**
 * O hipnograma de uma noite.
 *
 * O `getsummary`, que já usávamos, dá os **totais**: tanto de profundo, tanto
 * de REM. Isto dá a **forma** — e a forma é o que se lê. "6h30 de sono" não
 * distingue uma noite inteira de seis blocos partidos, e é a diferença que a
 * pessoa sente ao acordar.
 */
export async function hipnogramaDaNoite(
  accessToken: string,
  inicio: Date,
  fim: Date
): Promise<TrechoDeSono[]> {
  const body = await withingsRawCall("/v2/sleep", {
    action: "get",
    access_token: accessToken,
    startdate: String(Math.floor(inicio.getTime() / 1000)),
    enddate: String(Math.floor(fim.getTime() / 1000)),
    data_fields: "hr,rr,snoring,sdnn_1,rmssd,spo2",
  });

  const trechos: TrechoDeSono[] = [];
  for (const s of body?.series ?? []) {
    const ini = Number(s?.startdate);
    const f = Number(s?.enddate);
    const fase = Number(s?.state);
    if (!Number.isFinite(ini) || !Number.isFinite(f) || !Number.isFinite(fase)) continue;
    const trecho: TrechoDeSono = { inicio: ini, fim: f, fase };
    /*
     * `hr`, `rr` e `spo2` vêm como objetos com o instante por chave, do mesmo
     * jeito do intraday. Aqui guarda-se a média do trecho: o detalhe por
     * segundo dentro de um trecho de sono não muda o que a tela desenha.
     */
    for (const [campo, destino] of [["hr", "hr"], ["rr", "rr"], ["spo2", "spo2"]] as const) {
      const bruto = s?.[campo];
      if (bruto && typeof bruto === "object") {
        const vs = Object.values<any>(bruto).filter((x) => typeof x === "number");
        if (vs.length) (trecho as any)[destino] = vs.reduce((a, b) => a + b, 0) / vs.length;
      } else if (typeof bruto === "number") {
        (trecho as any)[destino] = bruto;
      }
    }
    trechos.push(trecho);
  }
  trechos.sort((a, b) => a.inicio - b.inicio);
  return trechos;
}

export interface TreinoWithings {
  /** Epoch em segundos. */
  inicio: number;
  fim: number;
  /** A categoria deles, como número. */
  categoria: number;
  calorias?: number;
  distancia?: number;
  passos?: number;
  hrMedio?: number;
  hrMaximo?: number;
}

/** Os treinos do período. */
export async function treinosDoPeriodo(
  accessToken: string,
  inicio: Date,
  fim: Date
): Promise<TreinoWithings[]> {
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  const body = await withingsRawCall("/v2/measure", {
    action: "getworkouts",
    access_token: accessToken,
    startdateymd: ymd(inicio),
    enddateymd: ymd(fim),
    data_fields: "calories,distance,steps,hr_average,hr_max",
  });

  const out: TreinoWithings[] = [];
  for (const w of body?.series ?? []) {
    const ini = Number(w?.startdate);
    const f = Number(w?.enddate);
    if (!Number.isFinite(ini) || !Number.isFinite(f)) continue;
    const d = w?.data ?? {};
    const t: TreinoWithings = { inicio: ini, fim: f, categoria: Number(w?.category) };
    if (typeof d.calories === "number") t.calorias = d.calories;
    if (typeof d.distance === "number") t.distancia = d.distance;
    if (typeof d.steps === "number") t.passos = d.steps;
    if (typeof d.hr_average === "number") t.hrMedio = d.hr_average;
    if (typeof d.hr_max === "number") t.hrMaximo = d.hr_max;
    out.push(t);
  }
  out.sort((a, b) => a.inicio - b.inicio);
  return out;
}

/**
 * Agrupa a série do dia por intervalo, para a tela desenhar.
 *
 * **1440 pontos não cabem num telemóvel.** O dado é por minuto; o desenho é por
 * intervalo, e dizer qual é o intervalo faz parte de não mentir sobre a
 * resolução. A frequência é **média** do intervalo e os passos são **soma** —
 * misturá-los é o erro fácil aqui: somar batimentos não significa nada.
 */
export function agruparPorIntervalo(
  pontos: PontoIntraday[],
  minutosPorBalde: number
): Array<{ t: number; hr: number | null; steps: number | null }> {
  if (minutosPorBalde <= 0) throw new Error("o intervalo tem de ser positivo");
  const segundos = minutosPorBalde * 60;
  const baldes = new Map<number, { hrs: number[]; steps: number }>();

  for (const p of pontos) {
    const chave = Math.floor(p.t / segundos) * segundos;
    const b = baldes.get(chave) ?? { hrs: [], steps: 0 };
    if (typeof p.hr === "number") b.hrs.push(p.hr);
    if (typeof p.steps === "number") b.steps += p.steps;
    baldes.set(chave, b);
  }

  return [...baldes.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, b]) => ({
      t,
      hr: b.hrs.length ? b.hrs.reduce((x, y) => x + y, 0) / b.hrs.length : null,
      steps: b.steps > 0 ? b.steps : null,
    }));
}
