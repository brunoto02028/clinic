/**
 * Até quando os números da aba Saúde estão actualizados (119).
 *
 * ## O que o Bruno viu
 *
 * Em 02/10/2026, às 09:23, o nosso app dizia **"Steps 182"** e o app da Withings
 * dizia **"Daily Steps 391 · 9:05 AM"**. Ele mandou as duas telas lado a lado:
 * *"já tem contradição de informação"*.
 *
 * E tinha razão em estranhar — mas os dois números estão certos. São o **mesmo
 * contador em dois instantes**: o dele sobe o dia inteiro, e o nosso é o que
 * havia na última vez que falámos com a Withings.
 *
 * ## Porque isso parece um defeito
 *
 * Porque não dizemos **quando**. O app deles carimba a hora em todas as cartas —
 * *"9:05 AM"*, *"4:12 AM"*. O nosso punha um número grande debaixo de *"Bom dia
 * · sexta, 2 de outubro"* e mais nada, e um número sem hora apresenta-se como
 * **agora**.
 *
 * O nosso número **nunca pode ser agora**: é sempre o da última sincronização.
 * Dizê-lo não é um detalhe de interface — é a diferença entre um dado e uma
 * afirmação falsa sobre este instante.
 *
 * ## E não é a mesma coisa que "há quanto tempo está calado"
 *
 * As pendências já dizem *"o relógio não manda nada há 3 dias"*. Isso é sobre a
 * **ligação estar partida**. Isto aqui é sobre uma ligação perfeitamente
 * saudável cujo último dado tem duas horas — que é o caso normal, e é o que faz
 * os números divergirem do app deles sem nada estar errado.
 */

export interface QuandoFoiLido {
  /** O instante da última sincronização, em ISO. */
  quando: string;
  /** Minutos desde então. */
  minutos: number;
}

/**
 * A sincronização mais recente de todas as ligações.
 *
 * A mais recente, e não a primeira da lista: quem tem o relógio e a balança tem
 * duas ligações, e o que interessa é **quão fresco é o mais fresco**.
 */
export function ultimaLeitura(
  ligacoes: Array<{ lastSyncedAt?: string | null; status?: string | null }> | null | undefined,
  agora: Date = new Date()
): QuandoFoiLido | null {
  if (!Array.isArray(ligacoes) || ligacoes.length === 0) return null;

  let maisRecente: number | null = null;
  for (const l of ligacoes) {
    if (!l?.lastSyncedAt) continue;
    const t = new Date(l.lastSyncedAt).getTime();
    if (Number.isNaN(t)) continue;
    if (maisRecente === null || t > maisRecente) maisRecente = t;
  }
  if (maisRecente === null) return null;

  /*
   * Um relógio adiantado em relação ao servidor daria minutos negativos, e
   * "atualizado há -3 minutos" é pior do que não dizer nada. Zero é a leitura
   * honesta: foi agora, tanto quanto se sabe.
   */
  const minutos = Math.max(0, Math.round((agora.getTime() - maisRecente) / 60000));
  return { quando: new Date(maisRecente).toISOString(), minutos };
}

/**
 * Quantas meia-noites há entre dois instantes, **no fuso do telefone**.
 *
 * `Math.round` e não `floor` de uma divisão de milissegundos: um dia de mudança
 * de hora tem 23 ou 25 horas, e é o número de meia-noites que decide se se diz
 * "ontem".
 *
 * `-1` quando a data não se lê — e aí a frase cai nas horas, que não afirmam
 * dia nenhum.
 */
function diasDeCalendario(de: Date, ate: Date): number {
  if (Number.isNaN(de.getTime()) || Number.isNaN(ate.getTime())) return -1;
  const meiaNoite = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((meiaNoite(ate) - meiaNoite(de)) / 86_400_000);
}

/**
 * A frase, nas duas línguas — ou `null` quando não há nada para dizer.
 *
 * **Abaixo de dois minutos não se diz nada.** "Atualizado há 0 minutos" é ruído
 * que não acrescenta: quem acabou de puxar a tela sabe que acabou de puxar.
 */
export function fraseDaUltimaLeitura(
  lido: QuandoFoiLido | null,
  horaLocal: (iso: string) => string | null,
  /**
   * O instante de referência. Existe para o teste poder fixar o dia; em
   * produção é sempre agora.
   *
   * É preciso, e não dá para derivar de `lido.minutos`, porque a fronteira que
   * interessa é a da **meia-noite** e não a de um número de horas — ver abaixo.
   */
  agora: Date = new Date()
): { en: string; pt: string } | null {
  if (!lido || lido.minutos < 2) return null;

  if (lido.minutos < 60) {
    return {
      en: `Updated ${lido.minutos} min ago`,
      pt: `Atualizado há ${lido.minutos} min`,
    };
  }

  /*
   * Passada uma hora, a hora do relógio diz mais do que os minutos: "atualizado
   * às 09:05" compara-se directamente com o que o app da Withings mostra, que é
   * exactamente a comparação que a pessoa vai fazer.
   *
   * **Mas só no próprio dia** (achado do code review). Uma ligação partida nunca
   * mais actualiza o carimbo — ele só é escrito quando a ingestão termina bem —,
   * e três dias depois o cabeçalho dizia *"Atualizado às 07:05"*, que se lê como
   * hoje às 07:05.
   *
   * É o defeito que este ficheiro existe para resolver, uma casa à frente: *"um
   * número sem hora apresenta-se como agora"* → uma hora sem dia apresenta-se
   * como hoje.
   */
  /**
   * **A fronteira é a meia-noite, não 24 horas** (segundo achado do review, no
   * mesmo sítio).
   *
   * O código dizia `minutos < 24 * 60`, e o comentário acima dizia *"só no
   * próprio dia"*. Não é a mesma coisa, e a diferença é visível:
   *
   * ```
   * sincronizou 02/10 às 23:00  ·  agora 03/10 às 00:30  →  "Atualizado às 23:00"
   * ```
   *
   * Uma hora e meia depois, o paciente lia uma hora **22,5 h no futuro**. É o
   * defeito deste ficheiro outra vez, uma casa à frente: uma hora sem dia
   * apresenta-se como hoje — e às 00:30 "hoje" já é outro dia.
   */
  const dias = diasDeCalendario(new Date(lido.quando), agora);

  if (dias === 0) {
    const hora = horaLocal(lido.quando);
    if (hora) {
      return { en: `Updated at ${hora}`, pt: `Atualizado às ${hora}` };
    }
  }

  if (dias >= 1) {
    return dias === 1
      ? { en: "Updated yesterday", pt: "Atualizado ontem" }
      : { en: `Updated ${dias} days ago`, pt: `Atualizado há ${dias} dias` };
  }

  const horas = Math.round(lido.minutos / 60);
  return { en: `Updated ${horas}h ago`, pt: `Atualizado há ${horas}h` };
}
