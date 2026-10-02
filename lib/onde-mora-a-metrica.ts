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
export const SAO_CONTAGEM = new Set(["steps", "calories", "activeMinutes"]);

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
