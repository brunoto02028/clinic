/**
 * O anel de meta, sem biblioteca de desenho (118 T-10).
 *
 * ## Porque isto é aritmética e não um componente de gráfico
 *
 * O app não tem `react-native-svg` nem gradientes, e acrescentá-los muda o
 * *fingerprint* nativo — o `eas update` deixaria de chegar aos binários já
 * instalados. Então o anel é feito de duas metades recortadas e rodadas, e o
 * que decide o desenho vive **todo aqui**.
 *
 * ## Porque até os lados da borda vivem aqui
 *
 * A primeira versão deixou ao JSX a escolha de que lados da borda pintar, e o
 * JSX escolheu **um** por metade. Num quadrado com `borderRadius` de 50 %, as
 * junções entre cores de lado correm nas **diagonais**: cada lado pinta 90° de
 * arco, não 180°. O resultado foi um anel que nunca fechava — a 100 % desenhava
 * dois quartos opostos, uns parênteses rodados que se leem como metade — e que
 * entre 37,5 % e 50 % **descolava do topo e deslizava** para baixo. Os cinco
 * testes dos ângulos passavam todos: os ângulos estavam certos, o desenho não.
 * É o padrão de sempre nesta base, uma regra provada na função e desfeita no
 * desenho, e a resposta é a mesma — tirar a decisão de lá.
 *
 * ## Como as duas metades formam um anel
 *
 * Cada metade é um recorte (`overflow: hidden`) de meio plano, com meio anel lá
 * dentro: **dois lados adjacentes** da borda pintados, que dão 180°. A metade
 * da direita cobre de 0 a 50 % do anel; a da esquerda, de 50 a 100 %. Cada uma
 * roda de `-180°` (invisível, fora do recorte) até `0°` (meia volta inteira), e
 * leva o `OFFSET_DA_BORDA` que alinha o começo do arco com as 12 horas.
 */

import { ehDeHoje } from "./resumo-de-saude";

export interface AnguloDoAnel {
  /** Quanto da meta está feito, de 0 a 1 — **cortado** em 1, porque é desenho. */
  progresso: number;
  /** A fracção de facto, sem corte: 2 é o dobro da meta. É esta que se diz. */
  fracao: number;
  /** Rotação da metade direita, em graus. `-180` é vazia, `0` é cheia. */
  direita: number;
  /** Rotação da metade esquerda. Só sai de `-180` depois dos 50 %. */
  esquerda: number;
  /** A meta foi cumprida — a tela marca isso, em vez de parar nos 100 %. */
  completo: boolean;
}

/**
 * Os ângulos do anel para um valor contra uma meta.
 *
 * `meta` nula, zero ou negativa devolve `null`: **não há anel sem meta**. As
 * metas são do paciente (118 T-7), e desenhar um arco contra um alvo que
 * ninguém escolheu é a mesma coisa que a faixa de referência que saiu da tela
 * do paciente na 099.
 */
export function anguloDoAnel(
  valor: number | null | undefined,
  meta: number | null | undefined
): AnguloDoAnel | null {
  if (meta == null || !Number.isFinite(meta) || meta <= 0) return null;
  if (valor == null || !Number.isFinite(valor)) return null;

  const fracao = valor / meta;

  /*
   * Acima da meta o anel fecha e fica fechado — a volta e meia não se desenha.
   * Mas o **número** diz a fracção inteira, como a `BarraDeMeta` faz com os
   * "160 % da sua meta": era aqui que o anel escrevia 100 % e a barra doze
   * linhas abaixo escrevia 160 %, dois números para o mesmo facto na mesma tela.
   */
  const progresso = Math.min(Math.max(fracao, 0), 1);

  /* Cada metade vale meia volta: 0,5 de progresso = 180° de rotação. */
  const direita = Math.min(progresso, 0.5) * 360 - 180;
  const esquerda = Math.max(progresso - 0.5, 0) * 360 - 180;

  return { progresso, fracao, direita, esquerda, completo: fracao >= 1 };
}

/** A percentagem como a tela a escreve — a de facto, não a cortada. */
export function percentagemDoAnel(a: AnguloDoAnel): number {
  return Math.round(Math.max(a.fracao, 0) * 100);
}

export type LadoDoAnel = "esquerda" | "direita";
export type LadoDaBorda = "top" | "right" | "bottom" | "left";

/**
 * Onde começa o arco de cada lado da borda, em graus de relógio (0 = 12 h,
 * a crescer no sentido dos ponteiros). Cada lado pinta 90° a partir daí.
 */
const COMECO_DO_LADO: Record<LadoDaBorda, number> = {
  top: 315,
  right: 45,
  bottom: 135,
  left: 225,
};

/**
 * Quanto a rotação tem de andar para o arco começar nas 12 horas.
 *
 * O par `top`+`right` cobre de 315° a 135°; queremos de 0° a 180°. São 45°.
 */
export const OFFSET_DA_BORDA = 45;

/** Os dois lados **adjacentes** que cada metade pinta. A ordem é a do arco. */
export function ladosPintados(lado: LadoDoAnel): [LadoDaBorda, LadoDaBorda] {
  return lado === "direita" ? ["top", "right"] : ["bottom", "left"];
}

/** A rotação que a metade leva no `transform`, offset incluído. */
export function rotacaoDaMetade(a: AnguloDoAnel, lado: LadoDoAnel): number {
  return (lado === "direita" ? a.direita : a.esquerda) + OFFSET_DA_BORDA;
}

/** O meio plano que cada recorte deixa ver, em graus de relógio. */
const RECORTE: Record<LadoDoAnel, [number, number]> = {
  direita: [0, 180],
  esquerda: [180, 360],
};

function comprimentoDentroDoRecorte(comeco: number, [ini, fim]: [number, number]): number {
  const c = ((comeco % 360) + 360) % 360;
  /* Meio anel são 180° a partir do começo; se passar das 12 h, parte-se em dois. */
  const pedacos: Array<[number, number]> =
    c + 180 <= 360 ? [[c, c + 180]] : [[c, 360], [0, c + 180 - 360]];
  return pedacos.reduce(
    (soma, [a, b]) => soma + Math.max(0, Math.min(b, fim) - Math.max(a, ini)),
    0
  );
}

/**
 * **Quantos graus de anel se vêem de facto**, somando as duas metades.
 *
 * É a régua do teste: tem de dar `progresso × 360`. Foi ela que mostrou que a
 * primeira versão desenhava 90° onde queria 180°, e que a 100 % ficava com
 * dois buracos — às 12 h e às 6 h.
 */
export function arcoVisivel(a: AnguloDoAnel): number {
  let total = 0;
  for (const lado of ["direita", "esquerda"] as const) {
    const comeco = COMECO_DO_LADO[ladosPintados(lado)[0]] + rotacaoDaMetade(a, lado);
    total += comprimentoDentroDoRecorte(comeco, RECORTE[lado]);
  }
  return total;
}

/**
 * O estado do anel — **uma decisão, num sítio**.
 *
 * Três coisas diferentes acabavam no mesmo desenho: não haver meta, a leitura
 * ser de outro dia, e não haver progresso hoje. A fila chama-se "Metas de
 * hoje"; um anel cheio por 14.200 passos de sábado afirma, numa terça parada,
 * que a meta de hoje está cumprida — e afirma-o em cima do ladrilho que diz
 * "Leitura de outro dia". Achado do review de 02/10/2026 na barra, repetido
 * aqui porque o anel nasceu sem o `dia`.
 */
export type EstadoDoAnel =
  | { tipo: "sem-meta" }
  | { tipo: "outro-dia" }
  | { tipo: "progresso"; angulo: AnguloDoAnel };

export function estadoDoAnel(
  valor: number | null | undefined,
  meta: number | null | undefined,
  dia?: string | null,
  hoje?: string
): EstadoDoAnel {
  const angulo = anguloDoAnel(valor, meta);
  if (!angulo) return { tipo: "sem-meta" };
  if (!ehDeHoje(dia, hoje)) return { tipo: "outro-dia" };
  return { tipo: "progresso", angulo };
}
