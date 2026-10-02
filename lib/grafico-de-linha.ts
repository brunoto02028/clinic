/**
 * A linha de uma métrica, em SVG, para um papel (118 T-8).
 *
 * ## Porque isto existe
 *
 * > *"só acho que no layout do relatório falta informação, gráfico, quero no
 * > mesmo estilo que o Sonar faz, o próprio Withings faz…"* — Bruno
 *
 * O papel mostrava **um número por métrica**, e o banco tem a série diária de
 * cada uma desde sempre. Um número sozinho não responde à pergunta que leva
 * alguém ao médico — *o que mudou*.
 *
 * ## Buraco é buraco: a linha não atravessa
 *
 * Uma linha que liga segunda a sábado por cima de quatro dias sem dado **conta
 * uma história que não aconteceu**. É a mesma regra do traçado do ECG, onde
 * apagar uma amostra encurtava a gravação — ali custou 1 segundo em 30, aqui
 * custa uma tendência inventada.
 *
 * Então a linha parte-se em segmentos, um por corrida de dias seguidos com dado.
 *
 * ## O que não se desenha
 *
 * **Nenhuma faixa de referência, nenhuma cor que julgue.** Saiu na 099 T-2 e não
 * volta por um gráfico novo. Uma banda verde de "normal" é uma afirmação
 * clínica desenhada, e um produto de reabilitação que a faça é outro produto.
 *
 * E o eixo **não começa em zero por hábito**: começa onde os dados começam, com
 * o mínimo e o máximo escritos ao lado. Um eixo esticado até zero achata a
 * variação real; um que não diz os limites sugere uma variação que não existe.
 *
 * ## SVG embutido, sem biblioteca e sem rede
 *
 * Pela mesma razão de não carregar fonte do Google: um documento clínico não
 * pede nada a terceiros enquanto alguém o lê. E um gráfico feito por JavaScript
 * não sai no PDF que a pessoa guarda.
 */

export interface PontoDoGrafico {
  dia: string;
  valor: number | null;
}

export interface Grafico {
  /** O SVG inteiro, pronto a embutir. */
  svg: string;
  /** Os extremos do período, para o papel os escrever. */
  minimo: number;
  maximo: number;
  /** Quantos dias entraram na linha. */
  dias: number;
  /** Quantos troços — mais de um quer dizer que houve dias sem dado. */
  segmentos: number;
}

export interface OpcoesDoGrafico {
  largura?: number;
  altura?: number;
  /** A cor do traço. Uma só: a linha não julga. */
  cor?: string;
}

/**
 * Quantos dias seguidos com dado são precisos para desenhar.
 *
 * **Dois.** Um ponto sozinho não é uma linha, e desenhá-lo como um pontinho no
 * meio de um gráfico vazio sugere uma série que não existe — o número grande
 * acima já diz o que há.
 */
const MINIMO_DE_PONTOS = 2;

/**
 * A série, desenhada — ou `null` quando não há o que desenhar.
 *
 * `null` quer dizer *"não há linha"*, e quem chama **não desenha caixa nenhuma**:
 * um gráfico vazio com eixos lê-se como "medimos e deu isto", quando o que houve
 * foi não haver medida.
 */
export function graficoDeLinha(
  pontos: PontoDoGrafico[] | null | undefined,
  opcoes: OpcoesDoGrafico = {}
): Grafico | null {
  if (!Array.isArray(pontos)) return null;

  const largura = opcoes.largura ?? 260;
  const altura = opcoes.altura ?? 44;
  const cor = opcoes.cor ?? "#4F7361";
  /* Meia espessura de traço de folga, senão o pico encosta no corte. */
  const margem = 3;

  /*
   * **Um dia que não se lê não entra.**
   *
   * Isto saía como `M NaN 22.2` dentro do `<path>`, e o navegador recusava o
   * atributo inteiro: a linha simplesmente não aparecia, com um erro na consola
   * que ninguém vê num PDF guardado. O gráfico ficava em branco entre o mínimo e
   * o máximo escritos — pior do que não o desenhar, porque o espaço vazio lê-se
   * como "medimos e não houve variação".
   *
   * Apanhado a olhar para o papel, não pelos testes: as séries que eles usavam
   * tinham todas datas válidas.
   */
  const ordenados = [...pontos]
    .filter((p) => typeof p?.dia === "string" && Number.isFinite(Date.parse(p.dia + "T00:00:00Z")))
    .sort((a, b) => a.dia.localeCompare(b.dia));
  if (ordenados.length === 0) return null;

  const comDado = ordenados.filter(
    (p): p is { dia: string; valor: number } =>
      typeof p.valor === "number" && Number.isFinite(p.valor)
  );
  if (comDado.length < MINIMO_DE_PONTOS) return null;

  const minimo = Math.min(...comDado.map((p) => p.valor));
  const maximo = Math.max(...comDado.map((p) => p.valor));

  /*
   * Uma série constante tem amplitude zero e dividiria por zero. Desenha-se a
   * meio: é a verdade — não variou — e não uma linha no fundo, que leria como
   * "esteve no mínimo".
   */
  const amplitude = maximo - minimo;
  const y = (v: number) =>
    amplitude === 0
      ? altura / 2
      : margem + (altura - margem * 2) * (1 - (v - minimo) / amplitude);

  /*
   * O **x é o dia**, não a posição na lista de quem tem dado. Senão três dias
   * medidos num mês desenham-se igualmente espaçados e a linha mente sobre
   * quando as coisas aconteceram — o mesmo erro do traçado do ECG, onde apagar
   * uma amostra adiantava tudo o que vinha depois.
   */
  const primeiro = ordenados[0].dia;
  const ultimo = ordenados[ordenados.length - 1].dia;
  const emDias = (dia: string) =>
    (Date.parse(dia + "T00:00:00Z") - Date.parse(primeiro + "T00:00:00Z")) / 86_400_000;
  const vao = Math.max(1, emDias(ultimo));
  const x = (dia: string) => (largura * emDias(dia)) / vao;

  /*
   * Os troços: um por corrida de dias **seguidos** com dado. É aqui que o buraco
   * fica buraco.
   */
  const troços: Array<Array<{ x: number; y: number }>> = [];
  let atual: Array<{ x: number; y: number }> = [];
  let diaAnterior: number | null = null;

  for (const p of ordenados) {
    const temDado = typeof p.valor === "number" && Number.isFinite(p.valor);
    const esteDia = emDias(p.dia);
    if (!temDado) continue;
    if (diaAnterior !== null && esteDia - diaAnterior > 1) {
      if (atual.length) troços.push(atual);
      atual = [];
    }
    atual.push({ x: x(p.dia), y: y(p.valor as number) });
    diaAnterior = esteDia;
  }
  if (atual.length) troços.push(atual);

  const caminhos = troços
    .filter((t) => t.length >= 2 && t.every((pt) => Number.isFinite(pt.x) && Number.isFinite(pt.y)))
    .map(
      (t) =>
        `<path d="${t
          .map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
          .join(" ")}" fill="none" stroke="${cor}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`
    );

  /* Um troço de um dia só não é linha: marca-se o ponto, para ele existir. */
  const pontinhos = troços
    .filter((t) => t.length === 1 && Number.isFinite(t[0].x) && Number.isFinite(t[0].y))
    .map((t) => `<circle cx="${t[0].x.toFixed(1)}" cy="${t[0].y.toFixed(1)}" r="1.8" fill="${cor}"/>`);

  if (caminhos.length === 0 && pontinhos.length === 0) return null;

  const svg =
    `<svg viewBox="0 0 ${largura} ${altura}" width="100%" height="${altura}" ` +
    `preserveAspectRatio="none" role="img" aria-hidden="true" focusable="false">` +
    caminhos.join("") +
    pontinhos.join("") +
    `</svg>`;

  return { svg, minimo, maximo, dias: comDado.length, segmentos: troços.length };
}

export interface FaseDoSono {
  rotulo: string;
  minutos: number;
  cor: string;
}

/**
 * As fases de uma noite, como barra empilhada.
 *
 * Sete horas com uma de sono profundo e sete com três são **noites diferentes**,
 * e o número de minutos sozinho não as distingue. É o que o aparelho entrega e o
 * que o app deles desenha.
 *
 * `null` quando nenhuma fase veio — e aí o papel mostra só a duração, em vez de
 * uma barra vazia que leria como "não dormiu".
 */
export function barraDasFases(
  fases: FaseDoSono[],
  opcoes: { largura?: number; altura?: number } = {}
): string | null {
  const largura = opcoes.largura ?? 260;
  const altura = opcoes.altura ?? 10;

  const comValor = fases.filter((f) => Number.isFinite(f.minutos) && f.minutos > 0);
  const total = comValor.reduce((s, f) => s + f.minutos, 0);
  if (total <= 0) return null;

  let x = 0;
  const pedacos = comValor.map((f) => {
    const w = (largura * f.minutos) / total;
    const r = `<rect x="${x.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="${altura}" fill="${f.cor}"><title>${f.rotulo}</title></rect>`;
    x += w;
    return r;
  });

  return (
    `<svg viewBox="0 0 ${largura} ${altura}" width="100%" height="${altura}" ` +
    `preserveAspectRatio="none" role="img" aria-hidden="true" focusable="false">` +
    pedacos.join("") +
    `</svg>`
  );
}
