/**
 * Os limites das metas do paciente, do lado do servidor (118 T-7).
 *
 * Ficheiro **sem imports**, por duas razões.
 *
 * A primeira é a mesma do `patient-only-write.ts`: o que pode regredir é a
 * decisão, e um teste que a leia não deve ter de carregar prisma e next-auth
 * para isso.
 *
 * A segunda é o Next: um ficheiro `route.ts` não pode exportar mais nada além
 * dos handlers — o `.next/types` recusa, e o `tsc` cai. Enquanto a tabela
 * vivia lá dentro, **nenhum** teste a podia importar; o que existia era uma
 * terceira cópia dos oito números, escrita à mão dentro do teste, que parecia
 * uma guarda e não guardava nada: nada a ligava ao servidor, e por isso
 * nenhuma alteração na rota podia fazer um teste cair.
 *
 * A outra cópia está em `mobile/src/lib/metas-formulario.ts`, e existe porque
 * **os dois lados verificam** — a tela para dizer a frase, o servidor porque a
 * tela não é uma fronteira. Quem as compara é
 * `__tests__/wearables/a-rota-das-metas.test.ts`, e divergirem é o defeito que
 * dá à pessoa um erro de rede onde devia haver uma frase.
 */

export interface LimiteDeMeta {
  /** Na unidade **guardada** — minutos, para o sono. */
  min: number;
  max: number;
  en: string;
  pt: string;
  /** Escrito em horas pela pessoa, guardado em minutos. */
  emHoras?: boolean;
  /** A unidade em que a pessoa escreve — vai na resposta, por extenso. */
  unidade: "steps" | "minutes" | "kcal" | "hours";
}

/**
 * **Não são recomendações.** São o que torna o número utilizável *como meta*:
 * um alvo de 400 passos não mede nada e um de um milhão desenha uma barra que
 * nunca sai do chão. Os dois tornam a tela inútil, que é diferente de errada.
 */
export const LIMITES_DAS_METAS: Record<string, LimiteDeMeta> = {
  steps: { min: 500, max: 100_000, en: "Steps", pt: "Passos", unidade: "steps" },
  activeMinutes: { min: 5, max: 1_440, en: "Active minutes", pt: "Minutos ativos", unidade: "minutes" },
  sleepMinutes: { min: 120, max: 960, en: "Sleep", pt: "Sono", emHoras: true, unidade: "hours" },
  activeCalories: { min: 50, max: 10_000, en: "Active calories", pt: "Calorias ativas", unidade: "kcal" },
};

export const CAMPOS_DE_META = Object.keys(LIMITES_DAS_METAS);

/**
 * O intervalo **na unidade em que a pessoa escreve** — horas, para o sono.
 *
 * Dizer "entre 120 e 960" a quem digitou horas é mandá-la dividir de cabeça
 * para descobrir o que a tela queria.
 *
 * **A unidade vai junto**, e isso saiu do QA: um `{"sleepMinutes":{"min":2,
 * "max":16}}` tem a frase certa para a pessoa e é ambíguo para quem o lê por
 * máquina — o campo chama-se `sleepMinutes` e os números são horas. Um cliente
 * a fazer `limits[campo]` limitaria minutos a 2–16.
 */
export function intervaloEscrito(
  campo: string
): { min: number; max: number; unit: LimiteDeMeta["unidade"] } {
  const l = LIMITES_DAS_METAS[campo];
  const div = l.emHoras ? 60 : 1;
  return { min: l.min / div, max: l.max / div, unit: l.unidade };
}

/** A recusa por extenso, nas duas línguas — inglês primeiro. */
export function fraseDaRecusa(recusados: string[], lingua: "en" | "pt"): string {
  return recusados
    .map((c) => {
      const { min, max } = intervaloEscrito(c);
      return lingua === "en"
        ? `${LIMITES_DAS_METAS[c].en}: choose between ${min} and ${max}`
        : `${LIMITES_DAS_METAS[c].pt}: escolha entre ${min} e ${max}`;
    })
    .join("; ");
}
