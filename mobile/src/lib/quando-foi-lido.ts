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
 * A frase, nas duas línguas — ou `null` quando não há nada para dizer.
 *
 * **Abaixo de dois minutos não se diz nada.** "Atualizado há 0 minutos" é ruído
 * que não acrescenta: quem acabou de puxar a tela sabe que acabou de puxar.
 */
export function fraseDaUltimaLeitura(
  lido: QuandoFoiLido | null,
  horaLocal: (iso: string) => string | null
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
   */
  const hora = horaLocal(lido.quando);
  if (hora) {
    return { en: `Updated at ${hora}`, pt: `Atualizado às ${hora}` };
  }

  const horas = Math.round(lido.minutos / 60);
  return { en: `Updated ${horas}h ago`, pt: `Atualizado há ${horas}h` };
}
