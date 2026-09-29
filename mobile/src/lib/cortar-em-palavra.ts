/**
 * Corta um texto sem partir palavra (107 T-1).
 *
 * `numberOfLines` do React Native corta onde o pixel acaba, e isso cai no meio
 * da palavra — na lista de Education lia-se *"History is full of treatments that
 * doctor…"*. Cortar antes, num limite que a gente escolhe, faz a reticência cair
 * sempre entre palavras.
 *
 * Continua valendo deixar `numberOfLines` como rede: se a fonte do aparelho for
 * maior que a prevista, ele ainda evita o texto vazar. O que este corte garante
 * é que, no caso normal, quem corta somos nós — e no lugar certo.
 */
export function cortarEmPalavra(texto: string | null | undefined, maximo: number): string {
  if (!texto) return "";
  const limpo = texto.trim();
  if (limpo.length <= maximo) return limpo;

  const pedaco = limpo.slice(0, maximo);

  // O limite pode cair **exatamente** no fim de uma palavra. Nesse caso ela
  // está inteira e jogar fora seria desperdiçar meia linha.
  const proximo = limpo[maximo];
  const acabouPalavra = proximo === undefined || /\s/.test(proximo);

  const ultimoEspaco = pedaco.lastIndexOf(" ");
  // Uma palavra só, maior que o limite: não há espaço onde cortar, e cortar no
  // meio dela é melhor que devolver a linha inteira.
  const base = acabouPalavra
    ? pedaco
    : ultimoEspaco > 0
      ? pedaco.slice(0, ultimoEspaco)
      : pedaco;

  // Pontuação solta antes da reticência fica feia: "carga," vira "carga".
  return base.replace(/[\s,;:.\-–—]+$/, "") + "…";
}
