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

import { diaLocal } from "./dia-e-noite-calculo";

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
  /**
   * O dia do valor, `YYYY-MM-DD`.
   *
   * O valor é o **último medido**, que pode não ser de hoje: um relógio que
   * sincronizou por último no sábado dá 14.200 passos a uma terça parada. Sem
   * o dia, a tela desenhava a barra cheia debaixo de um cabeçalho que diz
   * "Boa tarde · terça" — a afirmar que a meta de hoje foi cumprida por um
   * número de três dias antes. Achado do review de 02/10/2026.
   */
  dia: string;
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
      dia: ultimo.dia,
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

/* ──────────────────────────── as metas do paciente ──────────────────────────── */

/**
 * O valor é de hoje?
 *
 * O resumo mostra o **último valor medido**, e um relógio que sincronizou por
 * último no sábado dá 14.200 passos a uma terça parada. Desenhar a barra nesse
 * caso é afirmar que a meta **de hoje** foi cumprida por um número de três dias
 * antes — debaixo de um cabeçalho que diz "Boa tarde · terça". Achado do review
 * de 02/10/2026.
 *
 * `hoje` vem do `diaLocal`, **não** de `toISOString()`: o dia guardado é o dia
 * local da pessoa, e a chave em UTC já mordeu três vezes nesta base — depois da
 * meia-noite em Londres no verão, e em qualquer fuso a leste, os dois diferem e
 * a tela trata o dado de hoje como de ontem.
 *
 * Sem dia (`undefined`) desenha: é o caso da página de família, que mostra a
 * última leitura e não afirma nada sobre hoje.
 */
export function ehDeHoje(dia: string | null | undefined, hoje: string = diaLocal()): boolean {
  if (dia === undefined || dia === null) return true;
  return dia === hoje;
}

/* O tipo vive no `metas-formulario`, que não importa nada — ver lá o porquê. */
export type { Metas } from "./metas-formulario";
import type { Metas } from "./metas-formulario";

export interface Progresso {
  /** 0 a 1 — e pode passar de 1, que é informação, não erro. */
  fracao: number;
  valor: number;
  meta: number;
}

/**
 * O progresso de hoje contra a meta — **ou `null` quando não há meta**.
 *
 * Decisão do Bruno: *"o paciente define as metas"*. Então uma meta não
 * definida não é zero nem um valor por omissão: é **ausência**, e a tela
 * desenha o número sem barra nenhuma.
 *
 * Inventar um alvo aqui — "8.000 passos" — poria na tela de alguém uma régua
 * que ele não escolheu, e depois desenharia o quanto lhe falta para a atingir.
 * É a mesma classe de coisa que a faixa de referência que saiu na 099 T-2.
 *
 * **Passar da meta não é limitado a 1.** Quem andou o dobro andou o dobro, e
 * achatar isso em "100%" apaga a única parte boa do dia.
 */
export function progresso(valor: number | null, meta: number | null | undefined): Progresso | null {
  if (typeof valor !== "number" || typeof meta !== "number") return null;
  if (!Number.isFinite(valor) || !Number.isFinite(meta) || meta <= 0) return null;
  return { fracao: valor / meta, valor, meta };
}

/**
 * A meta de um **campo do ponto diário**, quando existe.
 *
 * É esta que a página de família usa, e é por ela que as quatro metas do
 * formulário chegam todas a algum sítio. Enquanto só existia a versão por
 * destaque, *"minutos ativos"* e *"calorias ativas"* eram duas caixas que se
 * podiam preencher e guardar sem que nada mudasse em tela nenhuma — o resumo
 * nem tem chave para elas. Achado do review de 02/10/2026.
 *
 * O que **não** tem meta, de propósito: frequência cardíaca de repouso, HRV e
 * oxigenação. Um alvo de frequência cardíaca é alvo clínico, e pô-lo na mão do
 * paciente seria deixá-lo definir uma régua sobre o próprio coração — o oposto
 * do que a decisão do Bruno pretendia.
 */
export function metaDoCampo(campo: string, metas: Metas | null | undefined): number | null {
  if (!metas) return null;
  switch (campo) {
    case "steps":
      return metas.steps;
    case "sleepDuration":
      return metas.sleepMinutes;
    case "activeMinutes":
      return metas.activeMinutes;
    case "activeCalories":
      return metas.activeCalories;
    default:
      return null;
  }
}

/**
 * Há quantos dias foi medido — `0` é hoje.
 *
 * **O defeito que isto fecha, visto no telemóvel do Bruno em 02/10/2026:** a
 * tela dizia *"Good morning · Friday 2 October"* e, debaixo disso, *"Steps
 * 249"* — e os 249 eram **de 1 de outubro**. O número é o último medido, e um
 * relógio que ficou na mesinha não produz um número novo; a tela apresentava o
 * de ontem como se fosse o do dia que acabou de nomear.
 *
 * A barra já não desenhava fora de hoje (`ehDeHoje`), mas o **número** não
 * dizia nada. Metade do conserto é pior do que nenhum: a barra desaparecer sem
 * explicação parece defeito, e o número continua a mentir.
 *
 * Conta em **dias locais**, pelas partes da data — `new Date("2026-10-01")`
 * seria meia-noite UTC e daria um dia a menos em qualquer fuso a oeste.
 */
export function diasDesdeAMedicao(
  dia: string | null | undefined,
  hoje: string = diaLocal()
): number | null {
  if (!dia) return null;
  const parte = (s: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  };
  const a = parte(dia);
  const b = parte(hoje);
  if (a === null || b === null) return null;
  return Math.round((b - a) / 86_400_000);
}

/**
 * A largura da barra, em por cento — **cortada em 100**.
 *
 * O corte é física: um `View` de 4px não pode ser mais largo que o pai. O que
 * não pode acontecer é o corte ser a última palavra, e foi o defeito que o QA
 * e o review apanharam os dois: a regra *"quem andou o dobro andou o dobro"*
 * estava na `progresso()`, provada por teste e por mutação, e **desfeita no
 * JSX** seis linhas abaixo do comentário que a enunciava. Dezassete mutações
 * passaram verdes com a tela a mentir.
 *
 * Vive aqui, e não dentro do componente, por isso mesmo: o que uma tela desenha
 * não é verificável nesta base — não há harness de componente no app —, e
 * então a decisão sai da tela.
 */
export function larguraDaBarra(fracao: number): number {
  if (!Number.isFinite(fracao) || fracao <= 0) return 0;
  return Math.min(100, fracao * 100);
}

/**
 * Passou da meta?
 *
 * É o que obriga a tela a dizer quando a barra mente por estar cheia. Sem isto,
 * 16.000 passos com meta de 8.000 desenham **a mesma barra** de 8.000 exactos,
 * e a única parte boa de um dia assim desaparece.
 */
export function passouDaMeta(fracao: number): boolean {
  return Number.isFinite(fracao) && fracao > 1;
}

/** A percentagem a dizer por extenso quando se passou da meta. */
export function porCentoDaMeta(fracao: number): number {
  return Math.round(fracao * 100);
}

/** A meta correspondente a um destaque, quando existe. */
export function metaDoDestaque(chave: Destaque["chave"], metas: Metas | null): number | null {
  switch (chave) {
    case "passos":
      return metaDoCampo("steps", metas);
    case "sono":
      return metaDoCampo("sleepDuration", metas);
    default:
      return null;
  }
}
