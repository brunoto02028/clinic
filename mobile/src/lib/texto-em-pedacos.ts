/**
 * Marcação dentro do parágrafo (107 T-4).
 *
 * `ArtigoEmBlocos` trata os **blocos** — título, parágrafo, lista, citação — e
 * nada dentro deles. Resultado: na lista de referências o paciente lia
 *
 *     Banks, K. (2013) _Maitland's Peripheral Manipulation Management._ Elsevier.
 *
 * com os sublinhados na tela. Numa citação bibliográfica o itálico não é
 * enfeite: é o que separa o título da obra do resto. Sem ele, e com os
 * sublinhados no meio, a linha fica pior do que ficaria em texto puro.
 *
 * ## O que este arquivo recusa a fazer
 *
 * Não é um interpretador de markdown. Marcação **não fechada** é impressa como
 * está, porque fechar por conta própria muda o texto de quem escreveu — e o
 * texto aqui é clínico.
 *
 * E `_` no meio de palavra não é itálico: `snake_case` e `campo_id` aparecem em
 * material técnico, e transformá-los em itálico come os sublinhados de algo que
 * era literal.
 */

export type EstiloDoPedaco = "normal" | "italico" | "negrito";

export interface PedacoDeTexto {
  texto: string;
  estilo: EstiloDoPedaco;
}

/**
 * `**negrito**` antes de `_itálico_`, e os dois só quando fechados.
 *
 * O asterisco duplo vem primeiro para que `**algo**` não seja lido como um
 * itálico de asterisco simples com asteriscos sobrando.
 *
 * O conteúdo não pode começar nem terminar em espaço — é o que separa
 * `*ênfase*` de `3 * 4 * 5`, onde os asteriscos são multiplicação e o texto
 * entre eles começa com espaço.
 */
const PADRAO =
  /\*\*(\S[^\n*]*?\S|\S)\*\*|(?<![\w*])\*(\S[^\n*]*?\S|\S)\*(?![\w*])|(?<![\w_])_(\S[^\n_]*?\S|\S)_(?![\w_])/g;

/**
 * Quebra um texto nos pedaços que a tela precisa desenhar.
 *
 * Texto sem marcação nenhuma devolve um único pedaço `normal` — o chamador não
 * precisa de caso especial.
 */
export function textoEmPedacos(texto: string | null | undefined): PedacoDeTexto[] {
  if (!texto) return [];

  const pedacos: PedacoDeTexto[] = [];
  let ultimo = 0;

  // `matchAll` sobre um padrão global: cada acerto traz o índice onde começou.
  for (const m of texto.matchAll(PADRAO)) {
    const inicio = m.index ?? 0;
    if (inicio > ultimo) {
      pedacos.push({ texto: texto.slice(ultimo, inicio), estilo: "normal" });
    }
    if (m[1] !== undefined) pedacos.push({ texto: m[1], estilo: "negrito" });
    else pedacos.push({ texto: (m[2] ?? m[3]) as string, estilo: "italico" });
    ultimo = inicio + m[0].length;
  }

  if (ultimo < texto.length) {
    pedacos.push({ texto: texto.slice(ultimo), estilo: "normal" });
  }

  // Nada casou: um pedaço só, e o texto sai idêntico ao que entrou.
  return pedacos.length > 0 ? pedacos : [{ texto, estilo: "normal" }];
}

/** Só para teste e para decidir se vale montar os pedaços. */
export function temMarcacao(texto: string | null | undefined): boolean {
  if (!texto) return false;
  PADRAO.lastIndex = 0;
  return PADRAO.test(texto);
}
