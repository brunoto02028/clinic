/**
 * A faixa da pressão arterial, e o rótulo que **não nomeia um diagnóstico**.
 *
 * Cópia de `lib/blood-pressure.ts` do lado da web. **É duplicação de propósito e
 * não dá para evitar:** o `@/` do app aponta para `mobile/src`, o da web para a
 * raiz, e nenhum alcança o outro. Um teste alimenta as duas e exige a mesma
 * resposta, para a duplicação não virar divergência.
 *
 * ## Por que o rótulo mudou
 *
 * As telas diziam *"Stage 1"* e *"Stage 2"* — o nome de uma **categoria
 * diagnóstica**. Numa tela que o paciente abre sozinho, isso lê-se como um
 * veredito do aplicativo. Quem diagnostica é médico, e é também o que mantém
 * este produto fora da definição de dispositivo médico.
 *
 * A saída não é esconder o número: 171/90 **tem** de parecer diferente de
 * 125/83. É **nomear a régua** — a tela compara com um parâmetro público em vez
 * de julgar.
 *
 * **Os limiares não mudaram.** Isto é vocabulário.
 */

export type FaixaDePressao = "LOW" | "NORMAL" | "ELEVATED" | "STAGE1" | "STAGE2" | "CRISIS";

/** Os mesmos limiares da web, na mesma ordem de teste. */
export function classificarPressao(sistolica: number, diastolica: number): FaixaDePressao {
  if (sistolica >= 180 || diastolica >= 120) return "CRISIS";
  if (sistolica >= 140 || diastolica >= 90) return "STAGE2";
  if (sistolica >= 130 || diastolica >= 80) return "STAGE1";
  if (sistolica >= 120 && diastolica < 80) return "ELEVATED";
  if (sistolica < 90 || diastolica < 60) return "LOW";
  return "NORMAL";
}

export const ROTULOS_DE_PRESSAO: Record<FaixaDePressao, { en: string; pt: string }> = {
  LOW: { en: "Low", pt: "Baixa" },
  NORMAL: { en: "Normal", pt: "Normal" },
  ELEVATED: { en: "Elevated", pt: "Elevada" },
  STAGE1: { en: "Above UK guidance", pt: "Acima do parâmetro do NHS" },
  STAGE2: { en: "Well above UK guidance", pt: "Bem acima do parâmetro do NHS" },
  CRISIS: { en: "Very high — get help now", pt: "Muito alta — procure ajuda agora" },
};

/**
 * A frase que desfaz a leitura errada.
 *
 * Fica ao lado das faixas, e não num rodapé: a etiqueta é o que se lê primeiro,
 * e a explicação é o que se lê depois — ou nunca.
 */
export const AVISO_DAS_FAIXAS = {
  en:
    "These bands come from UK blood-pressure guidance. They are not a diagnosis — " +
    "only a doctor can make one. If your readings keep landing here, book with your GP.",
  pt:
    "Estas faixas vêm do parâmetro britânico de pressão arterial. Não são um diagnóstico — " +
    "só um médico faz isso. Se as suas leituras continuarem aqui, marque com o seu médico.",
};
