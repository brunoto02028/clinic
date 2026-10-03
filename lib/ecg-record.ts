/**
 * O que um registro de ECG diz, e o que ele nunca diz (099 T-1).
 *
 * ## O que estava acontecendo
 *
 * A ingestão guarda ECG desde a 074 — o fato de ter acontecido, a frequência e
 * **a classificação do próprio aparelho**. Nenhuma tela lia isso: nem a do
 * paciente nem o painel. Um dado clínico guardado que ninguém vê é pior que um
 * dado ausente, porque dá a impressão de cobertura que não existe.
 *
 * ## O que este arquivo faz, e o que ele se recusa a fazer
 *
 * Ele **lê** o que o aparelho concluiu e traduz o código da Withings para uma
 * palavra. Ele **não interpreta** traçado nenhum — nós não temos traçado, de
 * propósito, e não teríamos o que dizer sobre ele se tivéssemos.
 *
 * ## A tabela estava errada, e errada do lado que não pode errar (02/10/2026)
 *
 * Até esta data este ficheiro lia `0` como *"sem sinal utilizável"* e **`1`
 * como "ritmo normal"**. O campo é o `ecg.afib` da Withings, e nele:
 *
 * | `afib` | o aparelho concluiu |
 * |---|---|
 * | 0 | **sem sinais de fibrilhação** — o ritmo sinusal, o resultado normal |
 * | 1 | **fibrilhação atrial** |
 * | 2 | não classificável (frequência muito baixa ou alta, outras arritmias) |
 *
 * Com a tabela antiga, um ECG com **fibrilhação detectada** aparecia na tela do
 * paciente como **"Ritmo normal"**. O erro caía exactamente do lado que não
 * pode errar.
 *
 * **Como se soube:** o Bruno fez dois ECG em 01/10/2026, os dois classificados
 * "Normal" pelo relógio, e o nosso app mostrava *"No usable signal"* — logo o
 * valor guardado era `0` e `0` **não** é ausência de sinal. A documentação
 * pública confirma `0` = *"no signs of atrial fibrillation"* e `2` = *"couldn't
 * be classified as normal rhythm or atrial fibrillation"*; a Withings descreve
 * três classes, e `1` é a que sobra.
 *
 * **O desempate, quando a certeza falta:** qualquer valor que não seja
 * reconhecido vira `inconclusivo`, e **nunca** `normal`. Se a leitura de `1`
 * estiver errada, o erro empurra para o alarme, não para o sossego — e é essa
 * a direcção certa para errar num número que fala do coração de alguém.
 */

export type ConclusaoDoEcg = "normal" | "fibrilacao" | "inconclusivo";

export interface RegistroDeEcg {
  /** Quando foi gravado, não o dia em que sincronizou. */
  recordedAt: string | null;
  heartRate: number | null;
  conclusao: ConclusaoDoEcg;
  /**
   * O identificador do sinal na Withings. Guardado para rastrear o registro
   * até a fonte — **não** é o traçado, e não abre um.
   */
  signalId: string | null;
}

/** A palavra que o painel e o app mostram, nas duas línguas. */
export const TEXTO_DA_CONCLUSAO: Record<ConclusaoDoEcg, { en: string; pt: string }> = {
  /*
   * "Sinus rhythm" é a palavra do próprio aparelho, e dizê-la é relatar.
   * "Normal" sozinho soaria a nota nossa sobre o coração da pessoa — e a
   * conclusão é do aparelho, não nossa.
   *
   * **"O aparelho", e não "o relógio"** (122 T-9): desde que a clínica atribui
   * ECG a pacientes, estas frases aparecem a quem pode nem ter relógio — e o
   * que gravou pode ter sido o BeamO em cima de uma marquesa.
   */
  normal: { en: "Sinus rhythm — the device found no signs of AFib", pt: "Ritmo sinusal — o aparelho não encontrou sinais de FA" },
  fibrilacao: { en: "The device found signs of atrial fibrillation", pt: "O aparelho encontrou sinais de fibrilação atrial" },
  inconclusivo: { en: "The device could not classify this recording", pt: "O aparelho não conseguiu classificar este registro" },
};

export function traduzirClassificacao(v: unknown): ConclusaoDoEcg {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (n === 0) return "normal";
  if (n === 1) return "fibrilacao";
  /**
   * Tudo o resto vira **inconclusivo**, e nunca "normal".
   *
   * O `2` da Withings é literalmente "não deu para classificar". E um código
   * novo que eles passem a devolver não pode aparecer na tela como se o
   * aparelho tivesse dito que estava tudo bem: o erro cairia exactamente do
   * lado que não pode errar.
   *
   * `null`/ausente também cai aqui. Um ECG sem classificação **aconteceu** —
   * dizer que não houve nada seria pior —, mas não autoriza uma palavra sobre
   * o ritmo.
   */
  return "inconclusivo";
}

/** Lê um `WearableDataPoint` de ECG. Devolve nulo se não for um. */
export function lerEcg(ponto: {
  dataType?: string | null;
  dataDate?: string | null;
  restingHr?: number | null;
  rawPayload?: string | null;
}): RegistroDeEcg | null {
  if (ponto?.dataType !== "ECG") return null;

  let bruto: Record<string, unknown> = {};
  try {
    bruto = ponto.rawPayload ? (JSON.parse(ponto.rawPayload) as Record<string, unknown>) : {};
  } catch {
    // Um payload que não abre não apaga o registro: o ECG **aconteceu**, e
    // dizer que não houve nada seria a pior das saídas.
    bruto = {};
  }

  return {
    recordedAt:
      typeof bruto.recordedAt === "string" ? bruto.recordedAt : ponto.dataDate ?? null,
    heartRate: typeof ponto.restingHr === "number" ? ponto.restingHr : null,
    conclusao: traduzirClassificacao(bruto.afibClassification),
    signalId:
      bruto.signalId === null || bruto.signalId === undefined ? null : String(bruto.signalId),
  };
}

/** O que a clínica precisa ver sem procurar. */
export function exigeAtencao(r: RegistroDeEcg | null): boolean {
  return r?.conclusao === "fibrilacao";
}
