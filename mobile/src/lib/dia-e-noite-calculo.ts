/**
 * As contas do dia e da noite, sem tela (099 T-8).
 *
 * Mesmo arranjo da tendência: a lógica é a parte que tem como errar, e um
 * ficheiro com JSX não é transformado pelo jest da raiz.
 */

export interface PontoDoDia {
  /** Epoch em segundos, no início do balde. */
  t: number;
  hr: number | null;
  steps: number | null;
}

export interface HoraDoDia {
  hora: number;
  /** `null` quando não houve leitura; é buraco, não zero. */
  hr: number | null;
  steps: number;
  /** `true` quando a hora ainda não chegou — diferente de não ter sido medida. */
  futuro: boolean;
}

/**
 * As 24 horas de um dia, com a distinção que a tela precisa.
 *
 * **"Ainda não aconteceu" e "não foi medido" não são a mesma coisa.** Às nove
 * da manhã, o resto do dia está vazio porque ainda não chegou; às nove da
 * noite, um vazio às três da tarde é o relógio fora do pulso. Desenhar os dois
 * iguais faz procurar um defeito que não existe — ou ignorar um que existe.
 */
export function horasDoDia(
  pontos: PontoDoDia[],
  opts: { ehHoje: boolean; horaAgora: number }
): HoraDoDia[] {
  if (pontos.length === 0) return [];
  const inicioDoDia = new Date(pontos[0].t * 1000);
  inicioDoDia.setHours(0, 0, 0, 0);
  const inicioSeg = Math.floor(inicioDoDia.getTime() / 1000);

  const porHora = new Map<number, { hrs: number[]; steps: number }>();
  for (const p of pontos) {
    const h = Math.floor((p.t - inicioSeg) / 3600);
    if (h < 0 || h > 23) continue;
    const b = porHora.get(h) ?? { hrs: [], steps: 0 };
    if (p.hr !== null) b.hrs.push(p.hr);
    if (p.steps !== null) b.steps += p.steps;
    porHora.set(h, b);
  }

  return Array.from({ length: 24 }, (_, hora) => {
    const b = porHora.get(hora);
    return {
      hora,
      hr: b && b.hrs.length ? b.hrs.reduce((x, y) => x + y, 0) / b.hrs.length : null,
      steps: b?.steps ?? 0,
      futuro: opts.ehHoje && hora > opts.horaAgora,
    };
  });
}

export interface TrechoDaNoite {
  inicio: number;
  fim: number;
  /** 0 acordado, 1 leve, 2 profundo, 3 REM — os códigos da Withings. */
  fase: number;
  hr?: number;
  rr?: number;
}

/** Quanto tempo em cada fase, em segundos. */
export function totaisPorFase(trechos: TrechoDaNoite[]): Record<number, number> {
  const out: Record<number, number> = {};
  for (const t of trechos) {
    const dur = t.fim - t.inicio;
    if (dur <= 0) continue;
    out[t.fase] = (out[t.fase] ?? 0) + dur;
  }
  return out;
}

/**
 * Quantas vezes a pessoa acordou — os trechos de fase 0 no meio da noite.
 *
 * O primeiro e o último não contam: deitar-se acordado e acordar no fim não são
 * despertares, e contá-los somaria dois a toda a gente, todas as noites.
 */
export function despertares(trechos: TrechoDaNoite[]): number {
  if (trechos.length <= 2) return 0;
  return trechos.slice(1, -1).filter((t) => t.fase === 0).length;
}

/**
 * `YYYY-MM-DD` na data **local** — o dia que a pessoa viveu.
 *
 * `toISOString().slice(0,10)` devolve UTC, e a ingestão grava a data local.
 * Entre a meia-noite e a uma da manhã do horário de verão britânico os dois
 * divergem, e a tela passa a procurar o dia anterior: buraco no ecrã com dado
 * no banco, e nada a dizer porquê.
 *
 * Três sítios usavam `toISOString` nesta tela. Um auxiliar com nome evita o
 * quarto.
 */
export function diaLocal(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * A escala das barras do dia: o mínimo e o máximo **do que é desenhado**.
 *
 * As barras são médias por hora. Escalá-las pelo mínimo e máximo dos pontos de
 * cinco minutos aperta-as todas no meio da altura — uma média nunca alcança o
 * extremo de um ponto isolado — e o gráfico subestima a variação do dia. Um
 * erro silencioso, porque o desenho continua plausível.
 *
 * Vive aqui, e não dentro do componente, para o teste a exercer por
 * comportamento em vez de ler a grafia do fonte (QA da T-8, R5).
 */
export function escalaDasBarras(horas: HoraDoDia[]): { min: number; max: number; faixa: number } {
  const medias = horas.map((h) => h.hr).filter((x): x is number => x !== null);
  if (medias.length === 0) return { min: 0, max: 0, faixa: 1 };
  const min = Math.min(...medias);
  const max = Math.max(...medias);
  return { min, max, faixa: max - min || 1 };
}

/** A altura de uma barra, de `minimo` a `minimo + amplitude`, pela escala dada. */
export function alturaDaBarra(
  hr: number,
  escala: { min: number; faixa: number },
  minimo = 8,
  amplitude = 46
): number {
  return minimo + ((hr - escala.min) / escala.faixa) * amplitude;
}
