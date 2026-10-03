/**
 * O dia em que uma medição aconteceu, **no fuso de quem mediu** (120 T-3).
 *
 * ## Porque isto vive num ficheiro só
 *
 * Vivia dentro do `withings-vitals.ts`, e por isso a pressão — que é lida no
 * `patient-monitoring.ts` — não a alcançava. O resultado: desde 02/10/2026 o
 * `VITALS` usava o fuso da medição, o sono e a actividade usavam o `date` que a
 * Withings manda, e **a pressão era a única série em UTC**.
 *
 * Concreto: uma leitura às 00:30 de Londres no verão arquivava em `D−1`,
 * enquanto o sono da mesma noite arquivava em `D`. Dois gráficos lado a lado no
 * mesmo papel, com a mesma noite em dias diferentes — num documento onde a
 * direcção da pressão é o item em que errar não é aceitável.
 *
 * Uma segunda cópia da conta teria o mesmo defeito que a primeira, mais tarde.
 * Por isso é um ficheiro, e não duas funções parecidas.
 */

/**
 * `YYYY-MM-DD` no fuso dado, ou em UTC quando não há fuso.
 *
 * **Sem fuso é UTC, de propósito.** As leituras antigas e as digitadas à mão não
 * têm fuso guardado, e reinterpretá-las moveria dados existentes de dia. O erro
 * nelas continua a ser o que já era; o que deixa de haver é erro nas novas.
 */
export function diaNoFuso(
  instante: Date | string | number | null | undefined,
  fuso?: string | null
): string | null {
  /**
   * **`new Date(null)` é a época, não `NaN`.**
   *
   * Apanhado pelo próprio teste desta tarefa: um `measuredAt` ausente produzia
   * `"1970-01-01"` — uma data plausível onde não havia medição nenhuma. É a
   * mesma família do `Number(null) === 0` que fazia uma sistólica em falta virar
   * 0 mmHg, e a razão de esta atividade existir.
   *
   * `new Date("")` também é inválida em alguns runtimes e válida noutros, por
   * isso a rejeição é explícita e não depende do `NaN`.
   */
  if (instante === null || instante === undefined || instante === "") return null;

  const d = instante instanceof Date ? instante : new Date(instante as any);
  if (Number.isNaN(d.getTime())) return null;

  const zona = typeof fuso === "string" && fuso.trim() ? fuso.trim() : null;
  if (!zona) return d.toISOString().split("T")[0];

  try {
    /* `en-CA` dá `YYYY-MM-DD`, que é a forma que o resto da base usa. */
    return new Intl.DateTimeFormat("en-CA", { timeZone: zona }).format(d);
  } catch {
    /*
     * Um fuso que o runtime não conhece não pode derrubar uma ingestão nem a
     * geração de um relatório. Cai em UTC, que é o comportamento anterior.
     */
    return d.toISOString().split("T")[0];
  }
}

/** A mesma pergunta, para quem já tem a medição em mãos. */
export function diaDaMedicao(v: {
  measuredAt: Date | string | number;
  timezone?: string | null;
}): string | null {
  return diaNoFuso(v.measuredAt, v.timezone);
}
