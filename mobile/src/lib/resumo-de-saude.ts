/**
 * O que mostrar no resumo da aba Saúde, e porquê (118 T-2).
 *
 * A primeira tela não é um painel de tudo: é a tela de alguém que acorda e abre
 * o telemóvel. Responde a **uma** pergunta — *o que mudou desde ontem* — e
 * depois sai da frente.
 *
 * Sem tela aqui dentro, de propósito: a escolha do que entra no resumo é a
 * parte que tem como errar, e um ficheiro com JSX não é transformado pelo jest
 * da raiz.
 */

export interface PontoDiario {
  dataDate: string;
  dataType: string;
  sleepDuration: number | null;
  sleepEfficiency: number | null;
  deepMinutes: number | null;
  remMinutes: number | null;
  hrv: number | null;
  restingHr: number | null;
  spo2: number | null;
  steps: number | null;
  activeCalories: number | null;
  activeMinutes: number | null;
  bodyTemperature?: number | null;
}

export interface Destaque {
  /** A chave da métrica — a tela traduz. */
  chave: "sono" | "fcRepouso" | "hrv" | "spo2" | "passos";
  valor: number;
  /** A diferença contra o período anterior. `null` quando não há com que comparar. */
  delta: number | null;
  /** Quantos dias entraram em cada lado da comparação. */
  diasComparados: number;
  /** A família a que pertence — é para lá que o toque leva. */
  familia: "coracao" | "sono" | "atividade";
}

/** O valor mais recente de um campo, e o dia em que foi medido. */
function maisRecente(
  pontos: PontoDiario[],
  campo: keyof PontoDiario
): { valor: number; dia: string } | null {
  const comValor = pontos
    .filter((p) => typeof p[campo] === "number")
    .sort((a, b) => b.dataDate.localeCompare(a.dataDate));
  if (comValor.length === 0) return null;
  return { valor: comValor[0][campo] as number, dia: comValor[0].dataDate };
}

/**
 * A variação de um campo: média dos dias recentes contra a dos antigos.
 *
 * A mesma regra da tendência, e pela mesma razão: **um dia mau não é uma
 * tendência**, e comparar duas leituras soltas produz um número que oscila
 * sozinho e parece informação.
 */
export function variacao(
  pontos: PontoDiario[],
  campo: keyof PontoDiario
): { delta: number; diasComparados: number } | null {
  const serie = pontos
    .filter((p) => typeof p[campo] === "number")
    .sort((a, b) => a.dataDate.localeCompare(b.dataDate))
    .map((p) => p[campo] as number);
  if (serie.length < 6) return null;

  const n = Math.max(2, Math.floor(serie.length / 3));
  const media = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  return { delta: media(serie.slice(-n)) - media(serie.slice(0, n)), diasComparados: n };
}

/**
 * Os destaques do resumo — no máximo quatro.
 *
 * **A ordem é a do corpo, não a da variação.** Ordenar por "o que mais mudou"
 * põe no topo o que oscila mais, que costuma ser ruído; e faz a tela mudar de
 * assunto todos os dias, o que impede alguém de criar o hábito de olhar para o
 * mesmo sítio.
 */
export function destaques(pontos: PontoDiario[]): Destaque[] {
  const campos: Array<[Destaque["chave"], keyof PontoDiario, Destaque["familia"]]> = [
    ["sono", "sleepDuration", "sono"],
    ["fcRepouso", "restingHr", "coracao"],
    ["hrv", "hrv", "coracao"],
    ["spo2", "spo2", "coracao"],
    ["passos", "steps", "atividade"],
  ];

  const out: Destaque[] = [];
  for (const [chave, campo, familia] of campos) {
    const ultimo = maisRecente(pontos, campo);
    if (!ultimo) continue;
    const v = variacao(pontos, campo);
    out.push({
      chave,
      valor: ultimo.valor,
      delta: v ? v.delta : null,
      diasComparados: v ? v.diasComparados : 0,
      familia,
    });
    if (out.length === 4) break;
  }
  return out;
}

export interface EstadoDaLigacao {
  status?: string | null;
  lastSyncError?: string | null;
  lastReadingAt?: string | null;
  daysSilent?: number | null;
}

export type Pendencia =
  | { tipo: "sem_aparelho" }
  | { tipo: "autorizacao_expirada" }
  | { tipo: "falha_na_sincronizacao"; mensagem: string }
  | { tipo: "calado"; dias: number };

/**
 * O que está em falta — e isto é tão importante quanto os números.
 *
 * **Hoje um relógio fora do pulso é indistinguível de um dia parado.** Zero
 * passos porque a pessoa não andou e zero passos porque o aparelho não
 * sincronizou desenham o mesmo gráfico, e levam a conclusões opostas sobre a
 * própria saúde.
 *
 * A ordem é de gravidade: sem aparelho não há nada; autorização expirada é a
 * que só o dono resolve; falha é passageira; calado é um aviso.
 */
export function pendencias(ligacoes: EstadoDaLigacao[]): Pendencia[] {
  if (ligacoes.length === 0) return [{ tipo: "sem_aparelho" }];

  const out: Pendencia[] = [];
  for (const c of ligacoes) {
    const erro = c.lastSyncError ?? "";
    if (/refresh_token|invalid_grant|unauthor/i.test(erro)) {
      out.push({ tipo: "autorizacao_expirada" });
      continue;
    }
    if (erro) {
      out.push({ tipo: "falha_na_sincronizacao", mensagem: erro });
      continue;
    }
    if (typeof c.daysSilent === "number" && c.daysSilent >= 2) {
      out.push({ tipo: "calado", dias: c.daysSilent });
    }
  }

  /* Uma pendência de cada tipo: três ligações com o mesmo problema são um
     problema, não três linhas. */
  const vistos = new Set<string>();
  return out.filter((p) => {
    if (vistos.has(p.tipo)) return false;
    vistos.add(p.tipo);
    return true;
  });
}
