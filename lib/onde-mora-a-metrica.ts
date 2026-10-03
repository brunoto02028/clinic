/**
 * Onde cada métrica mora, dito num sítio só (119 T-9).
 *
 * ## O defeito que fez isto existir
 *
 * O Bruno gerou o primeiro relatório pelo app e mandou-o ao lado da aba Saúde: a
 * aba mostrava **Resting HR 54** e **SpO2 99**, e o relatório não tinha nenhum
 * dos dois.
 *
 * A ingestão da Withings escreve o `WearableDataPoint` em **três** baldes —
 * `ACTIVITY`, `VITALS` e `SLEEP` — e **nunca** escreve `BODY`. O único escritor
 * de `BODY` no repositório inteiro é o webhook da Terra, que está desligado.
 *
 * E três leitores procuravam `restingHr`, `hrv` e `spo2` exactamente em `BODY`:
 *
 * | ficheiro | o que ficava mudo |
 * |---|---|
 * | `lib/patient-monitoring.ts` | o relatório do paciente |
 * | `app/api/admin/patients/[id]/monitoring/route.ts` | a tela de monitoramento da clínica |
 * | `lib/monitoring-deviation.ts` | a detecção de desvio da clínica |
 *
 * Como só a Withings está ligada, isso valia para **todos** os pacientes. A
 * clínica via três linhas vazias e um alerta que nunca disparava, e nada
 * distinguia *"o paciente não mediu"* de *"estamos a olhar para a gaveta
 * errada"*.
 *
 * ## Porque um mapa, e não três correcções
 *
 * O erro aconteceu porque cada leitor escolheu o seu balde **de memória**. Três
 * correcções deixariam três escolhas, e a quarta tela nasceria com a quarta.
 * Aqui há uma, e quem quiser uma série pergunta.
 */

/** Um ponto diário, como o `WearableDataPoint` o guarda. */
export interface PontoDiario {
  dataType?: string | null;
  dataDate?: string | null;
  [campo: string]: unknown;
}

export interface ValorDoDia {
  dia: string;
  valor: number | null;
}

/**
 * Os baldes onde cada métrica pode estar, **por ordem de preferência**.
 *
 * `restingHr` está em dois, e isso é uma escolha e não um acaso: a Withings
 * entrega-a no resumo do **sono** e nas medições do **dia**, e não são a mesma
 * coisa:
 *
 * - a do **sono** é o `hr_average` da noite, que a Withings mede — a frequência
 *   em repouso como as palavras significam;
 * - a das **medições** é o **mínimo** das frequências capturadas no dia, e esse
 *   número é **nosso**: `vitalsByDay` faz `Math.min(...)` porque a média de um
 *   dia de frequências não é uma frequência de repouso por definição nenhuma.
 *
 * Esta frase dizia "a média", e estava errada — apanhado pelo QA comparativo de
 * 02/10. Num mapa que existe para ser a única fonte de verdade sobre a
 * proveniência, descrever mal a origem é o defeito, não o detalhe.
 *
 * O que fica por decidir, e está dito aqui para não se perder: um dia sem noite
 * registada mostra um número **que nós calculámos**, e nada no relatório o
 * distingue dos dias em que ele veio da Withings. Um número que muda de origem
 * entre dois dias não é bem uma série.
 *
 * Fica a do sono à frente, com a das medições como recurso para os dias sem
 * noite registada. A ordem é a preferência, e está aqui para ser lida.
 */
export const ONDE_MORA: Record<string, readonly string[]> = {
  sleepDuration: ["SLEEP"],
  deepMinutes: ["SLEEP"],
  remMinutes: ["SLEEP"],
  lightMinutes: ["SLEEP"],
  awakeMinutes: ["SLEEP"],
  hrv: ["SLEEP"],
  restingHr: ["SLEEP", "VITALS"],
  spo2: ["VITALS"],
  bodyTemperature: ["VITALS"],
  steps: ["ACTIVITY"],
  activeMinutes: ["ACTIVITY"],
  /*
   * **Os nomes são os das colunas, e não os que soam bem.**
   *
   * Este mapa tinha `calories` e `distance` — nenhuma das duas existe no
   * `WearableDataPoint`, que guarda `activeCalories` e `totalCalories` e não
   * guarda distância nenhuma. Ninguém as lia ainda, por isso não doía; mas é a
   * mesma família do defeito que este ficheiro existe para fechar — um nome
   * escrito de memória, e uma série sempre vazia à espera de quem o usasse.
   *
   * Apanhado pelo teste que obriga o mapa do app e o do servidor a concordarem.
   */
  activeCalories: ["ACTIVITY"],
  totalCalories: ["ACTIVITY"],
};

/**
 * As métricas que se contam, e não se medem.
 *
 * `Steps 919.5` foi ao papel: a média do período impressa como se fosse uma
 * contagem. Ninguém deu meio passo, e um número assim faz duvidar dos outros que
 * estão ao lado — que estão certos.
 *
 * O que **é** fraccionado — mmHg, minutos de sono, ms de VFC — fica como está:
 * arredondar uma média de pressão perderia informação real.
 */
export const SAO_CONTAGEM = new Set([
  "steps",
  "activeMinutes",
  /*
   * **`activeCalories` e `totalCalories`, e não `calories`.**
   *
   * Estava aqui `calories`, que é o nome que o `ONDE_MORA` catorze linhas acima
   * acabou de corrigir — não existe no `WearableDataPoint`. Logo esta lista
   * protegia um campo inexistente e deixava os dois reais de fora: o primeiro
   * chamador a pedir uma média de calorias imprimiria `919,5 kcal`, que é
   * exactamente o defeito que esta lista existe para impedir.
   */
  "activeCalories",
  "totalCalories",
]);

/**
 * **Como cada número foi feito**, nas duas línguas (120 T-6).
 *
 * ## Porquê
 *
 * Três métricas saem lado a lado no papel, na mesma coluna, com a mesma
 * aparência — e são três contas diferentes:
 *
 * - `spo2` é a **média das medições do dia**, e depois a média dos dias. Média
 *   de médias não ponderada: um dia com uma medição pesa igual a um dia com
 *   oito;
 * - `restingHr`, quando vem das medições, é o **mínimo** do dia (`Math.min`),
 *   porque a média de um dia de frequências não é uma frequência de repouso;
 * - `hrv` é a **média de duas janelas** da noite — `rmssd_start_avg` e
 *   `rmssd_end_avg` —, e o tamanho das janelas não está documentado.
 *
 * Nada disto é inventar dado. O que falta é **dizê-lo**, que é a mesma regra
 * pela qual o papel do ECG imprime *"25 mm/s, 10 mm/mV"*: um número sem a sua
 * escala convida a medir com a régua errada.
 *
 * ## O que estas frases não fazem
 *
 * Não julgam, não interpretam e não dizem se o valor é bom. Descrevem a conta.
 */
export const COMO_FOI_CALCULADO: Record<string, { en: string; pt: string }> = {
  sleepDuration: {
    /*
     * **"deep + light + REM", e não "as fases"**: o tempo acordado não entra na
     * soma, e uma noite em que uma das três não veio imprime uma soma parcial.
     * A frase anterior dizia *"as fases"*, que inclui o acordado — descrevia
     * uma conta que o código não faz.
     */
    en: "deep, light and REM added up for the night — time awake is not counted",
    pt: "sono profundo, leve e REM somados na noite — o tempo acordado não entra",
  },
  restingHr: {
    en: "Withings' night average when there is a night; otherwise the lowest reading of the day",
    pt: "média da noite, quando há noite registrada; senão, a menor leitura do dia",
  },
  hrv: {
    /*
     * **"ou o único que vier"**: o `mediaDeRmssd` usa um só quando a Withings
     * manda um só, e a frase dizia sempre "média dos dois". Estava no comentário
     * do código e não na frase que vai ao papel.
     */
    en: "average of the night's start and end rMSSD — or whichever of the two came",
    pt: "média do rMSSD do início e do fim da noite — ou o único dos dois que vier",
  },
  spo2: {
    en: "average of the day's readings, then averaged across days",
    pt: "média das medições do dia, e depois a média dos dias",
  },
  steps: {
    /*
     * **"cada dia"**, e não *"o dia"*: o número impresso é a **média** dos dias,
     * e a frase dizia *"o total do dia"* — descrevia o valor diário, ao lado de
     * um número que é a média deles. Só não mentia porque a legenda está à
     * esquerda a dizer "média dos N dias".
     */
    en: "each day is the device's own step total",
    pt: "cada dia é o total de passos que o aparelho contou",
  },
  systolic: {
    en: "average of the day's readings, then averaged across days",
    pt: "média das leituras do dia, e depois a média dos dias",
  },
  diastolic: {
    en: "average of the day's readings, then averaged across days",
    pt: "média das leituras do dia, e depois a média dos dias",
  },
  /*
   * **A dor e o humor também** (achado do QA): elas saem na mesma coluna, com a
   * mesma aparência, e saíam sem frase. O teste afirmava cobrir *"cada métrica
   * impressa"* a partir de uma lista escrita à mão de sete nomes — e eram nove.
   */
  /*
   * **"cada dia é a média dos registos dele"**, e não *"a média dos dias"* seca.
   *
   * As duas frases diziam *"média dos dias em que você registrou"* — e o
   * `DailyCheckIn` tem até **três** linhas por dia (manhã, tarde, noite). O
   * número é a média dos dias **de** uma média dos registos de cada dia, e isso
   * tem de estar dito: duas das nove frases descreviam uma conta que o código
   * não fazia, apanhadas na 2ª rodada do review.
   */
  painLevel: {
    en: "each day is the average of that day's entries; the number is the average of the days",
    pt: "cada dia é a média dos registros daquele dia; o número é a média dos dias",
  },
  moodLevel: {
    en: "each day is the average of that day's entries; the number is the average of the days",
    pt: "cada dia é a média dos registros daquele dia; o número é a média dos dias",
  },
};

/**
 * A frase, ou `null` quando a métrica não tem uma.
 *
 * `null` é de propósito e não é um buraco a tapar: uma frase inventada para uma
 * métrica nova seria pior do que nenhuma. O teste é que obriga a métrica nova a
 * ganhar a sua.
 */
export function comoFoiCalculado(
  campo: string,
  idioma: "en" | "pt" = "en"
): string | null {
  return COMO_FOI_CALCULADO[campo]?.[idioma] ?? null;
}

/**
 * A série de uma métrica, juntando os baldes onde ela pode viver.
 *
 * **Um dia aparece uma vez.** Quando a métrica mora em dois baldes e os dois têm
 * valor para o mesmo dia, ganha o primeiro da lista — ver `ONDE_MORA`. Deixar os
 * dois entrarem daria dois pontos para o mesmo dia e uma média que conta esse
 * dia a dobrar.
 */
export function serieDaMetrica(pontos: PontoDiario[], campo: string): ValorDoDia[] {
  const baldes = ONDE_MORA[campo];
  if (!baldes) return [];

  /* dia -> valor, preenchido na ordem de preferência dos baldes. */
  const porDia = new Map<string, number>();

  for (const balde of baldes) {
    for (const p of pontos) {
      if ((p?.dataType ?? "") !== balde) continue;
      const dia = typeof p.dataDate === "string" ? p.dataDate : null;
      if (!dia || porDia.has(dia)) continue;
      const bruto = p[campo];
      if (typeof bruto !== "number" || !Number.isFinite(bruto)) continue;
      porDia.set(dia, bruto);
    }
  }

  return [...porDia.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dia, valor]) => ({ dia, valor }));
}

/**
 * O número como se escreve: contagens inteiras, medidas como estão.
 *
 * `null` continua `null` — um buraco não se arredonda para zero.
 */
export function comoSeEscreve(campo: string, valor: number | null): number | null {
  if (valor === null || !Number.isFinite(valor)) return null;
  return SAO_CONTAGEM.has(campo) ? Math.round(valor) : valor;
}
