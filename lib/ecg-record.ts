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
 * A classificação da Withings, para o ScanWatch:
 *
 * | valor | o aparelho concluiu |
 * |---|---|
 * | 0 | sem sinal utilizável |
 * | 1 | ritmo normal |
 * | 2 | **fibrilação atrial** |
 * | 3 | inconclusivo (frequência alta, movimento) |
 */

export type ConclusaoDoEcg = "sem_sinal" | "normal" | "fibrilacao" | "inconclusivo";

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
  normal: { en: "Normal rhythm", pt: "Ritmo normal" },
  fibrilacao: { en: "Atrial fibrillation detected", pt: "Fibrilação atrial detectada" },
  inconclusivo: { en: "Inconclusive", pt: "Inconclusivo" },
  sem_sinal: { en: "No usable signal", pt: "Sem sinal utilizável" },
};

function traduzirClassificacao(v: unknown): ConclusaoDoEcg {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (n === 1) return "normal";
  if (n === 2) return "fibrilacao";
  if (n === 3) return "inconclusivo";
  if (n === 0) return "sem_sinal";
  /**
   * Classificação desconhecida vira **inconclusivo**, nunca "normal".
   *
   * Um código novo que a Withings passe a devolver não pode aparecer na tela
   * como se o aparelho tivesse dito que estava tudo bem — o erro cairia
   * exatamente do lado que não pode errar.
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
