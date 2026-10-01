/**
 * As cinco famílias da aba Saúde, e o que cada uma leva (118 T-3).
 *
 * *"uma página para cada informação? como o withings faz?"* — com uma correção
 * que vale a pena ter escrita: **uma página por família, não por métrica**.
 *
 * São ~12 medições hoje e mais quando entrarem os outros aparelhos. Doze
 * páginas é muita superfície para construir, testar e manter honesta — e
 * ninguém pensa *"os meus minutos de REM"*, pensa *"o meu sono"*. A própria
 * Withings agrupa assim.
 *
 * A divisão também é o que faz a gama inteira caber sem página nova: a balança
 * cai em Corpo, o tapete de sono em Sono, a braçadeira em Pressão, e a
 * velocidade de onda de pulso da balança cai em Coração.
 *
 * Sem tela aqui dentro: a configuração é dado, e dado testa-se.
 */

export type ChaveDeFamilia = "coracao" | "sono" | "atividade" | "pressao" | "corpo";

/** Uma métrica dentro de uma página de família. */
export interface MetricaDaFamilia {
  /** O campo do ponto diário, ou `null` quando a secção é um desenho próprio. */
  campo: string | null;
  en: string;
  pt: string;
  unidade: string;
  /** Casas decimais na frase da variação. */
  casas?: number;
  /** O eixo começa no zero? Faz sentido para passos, não para frequência. */
  deZero?: boolean;
  /** Divide o valor guardado antes de mostrar — minutos para horas, por exemplo. */
  divisor?: number;
  /** Que aparelho costuma medir isto, para a tela poder dizer. */
  deOnde?: string;
}

export interface Familia {
  chave: ChaveDeFamilia;
  en: string;
  pt: string;
  /** O `dataType` do ponto diário onde estas métricas vivem. */
  tipoDoPonto: string;
  metricas: MetricaDaFamilia[];
  /** Desenhos próprios desta família, além das tendências. */
  temODia?: boolean;
  temANoite?: boolean;
  temEcg?: boolean;
  /** Quando a família tem tela própria que já existe, é para lá que se vai. */
  telaPropria?: string;
}

export const FAMILIAS: Familia[] = [
  {
    chave: "coracao",
    en: "Heart",
    pt: "Coração",
    tipoDoPonto: "BODY",
    temODia: true,
    temEcg: true,
    metricas: [
      { campo: "restingHr", en: "Resting heart rate", pt: "FC de repouso", unidade: "bpm" },
      { campo: "hrv", en: "Heart rate variability", pt: "Variabilidade (HRV)", unidade: "ms" },
      { campo: "spo2", en: "Blood oxygen", pt: "Oxigenação", unidade: "%" },
    ],
  },
  {
    chave: "sono",
    en: "Sleep",
    pt: "Sono",
    tipoDoPonto: "SLEEP",
    temANoite: true,
    metricas: [
      { campo: "sleepDuration", en: "Time asleep", pt: "Tempo de sono", unidade: "h", casas: 1, divisor: 60 },
      { campo: "deepMinutes", en: "Deep sleep", pt: "Sono profundo", unidade: "min" },
      { campo: "remMinutes", en: "REM sleep", pt: "Sono REM", unidade: "min" },
      { campo: "sleepEfficiency", en: "Efficiency", pt: "Eficiência", unidade: "%" },
    ],
  },
  {
    chave: "atividade",
    en: "Activity",
    pt: "Atividade",
    tipoDoPonto: "ACTIVITY",
    metricas: [
      { campo: "steps", en: "Steps", pt: "Passos", unidade: "", deZero: true },
      { campo: "activeCalories", en: "Active calories", pt: "Calorias ativas", unidade: "kcal", deZero: true },
      { campo: "activeMinutes", en: "Active minutes", pt: "Minutos ativos", unidade: "min", deZero: true },
    ],
  },
  {
    chave: "pressao",
    en: "Blood pressure",
    pt: "Pressão",
    tipoDoPonto: "BLOOD_PRESSURE",
    metricas: [],
    /*
     * A pressão já tem tela, com a atribuição da braçadeira partilhada e o
     * histórico — refazê-la aqui seria uma segunda versão a divergir da
     * primeira. A família leva para lá.
     */
    telaPropria: "/(app)/(clinica)/blood-pressure",
  },
  {
    chave: "corpo",
    en: "Body",
    pt: "Corpo",
    tipoDoPonto: "BODY",
    metricas: [
      { campo: "bodyTemperature", en: "Body temperature", pt: "Temperatura", unidade: "°C", casas: 1 },
      /*
       * Peso, massa gorda e composição corporal chegam quando uma balança
       * entrar na conta — a ingestão já pede todos os tipos de medida desde a
       * 099 T-7, então não há lista a ampliar. Só faltam as linhas aqui.
       */
    ],
  },
];

export function familiaPorChave(chave: string): Familia | null {
  return FAMILIAS.find((f) => f.chave === chave) ?? null;
}

/**
 * O valor a mostrar, já dividido quando a unidade guardada não é a mostrada.
 *
 * O sono é guardado em **minutos** e mostrado em **horas**: dividir na tela e
 * esquecer de dividir na variação produziria uma frase a falar de "0.4 min".
 * Por isso a conversão vive aqui, com a configuração, e não em cada sítio que
 * desenha.
 */
export function valorMostrado(bruto: number, m: MetricaDaFamilia): number {
  return m.divisor ? bruto / m.divisor : bruto;
}
