/**
 * A geometria de um traçado de ECG em papel (099 T-9).
 *
 * ## Porque isto é uma conta e não um desenho
 *
 * Um ECG impresso não é um gráfico bonito: é um **instrumento de medida**. Quem
 * o recebe põe uma régua em cima e lê intervalos — o PR, o QRS, o QT — contando
 * quadradinhos. Isso só funciona se a escala for a convencional:
 *
 * - **25 mm/s** na horizontal: um segundo ocupa 25 mm, um quadradinho de 1 mm
 *   vale 40 ms, e o quadrado grande de 5 mm vale 200 ms;
 * - **10 mm/mV** na vertical: um milivolt sobe 10 mm, e cada quadradinho vale
 *   0,1 mV.
 *
 * É a escala que o rodapé do PDF da Withings declara, e é por ela que um
 * cardiologista lê o papel sem perguntar nada a ninguém. Um traçado desenhado
 * "para caber bonito" mede errado em silêncio — e é pior do que não imprimir.
 *
 * ## As amostras vêm em micro-volts
 *
 * A Withings documenta o `signal` como *"Signal value in micro-volt (μV)"*.
 * Então 1 µV = 0,001 mV = **0,01 mm**. Tratá-las como milivolts daria um
 * traçado mil vezes maior — e tratá-las como milímetros, um traçado plano.
 *
 * ## Porque em faixas
 *
 * Trinta segundos a 25 mm/s são **750 mm** de papel. Não cabem numa folha, e é
 * por isso que o PDF deles parte em três faixas de dez segundos — a mesma coisa
 * que um eletrocardiógrafo faz com três derivações.
 *
 * Este ficheiro **não desenha**: devolve números. O que uma tela ou um PDF faz
 * com eles é problema deles, e o que se pode verificar sem abrir nenhum dos
 * dois é isto.
 */

/** A convenção, e não uma preferência nossa. */
export const MM_POR_SEGUNDO = 25;
export const MM_POR_MILIVOLT = 10;

/** 1 µV = 0,001 mV = 0,01 mm. */
export const MM_POR_MICROVOLT = MM_POR_MILIVOLT / 1000;

export interface Faixa {
  /** O segundo em que esta faixa começa, dentro da gravação. */
  inicioSegundos: number;
  /** Quantos segundos ela cobre. */
  duracaoSegundos: number;
  /**
   * Os pontos, em **milímetros**, com a origem no canto superior esquerdo da
   * faixa e `y` a crescer para baixo — como todo sistema de coordenadas de
   * desenho. A linha de base fica a meio da altura.
   */
  pontos: Array<{ x: number; y: number }>;
}

export interface TracadoEmPapel {
  faixas: Faixa[];
  /** Largura de uma faixa, em mm — a duração vezes 25. */
  larguraMm: number;
  /** Altura de uma faixa, em mm. */
  alturaMm: number;
  /** Quantos segundos o traçado inteiro cobre. */
  duracaoSegundos: number;
  /**
   * Quantas amostras entraram em cada ponto desenhado.
   *
   * `1` quer dizer que nada foi descartado. Acima de `1`, cada ponto é a média
   * de um punhado — e isso **tem de ser dito**, porque um traçado reduzido já
   * não é o sinal, é um resumo dele.
   */
  amostrasPorPonto: number;
}

export interface OpcoesDoPapel {
  /** Segundos por faixa. Dez é o que a convenção e o papel A4 permitem. */
  segundosPorFaixa?: number;
  /** Altura de cada faixa, em mm. 40 mm são ±2 mV, que chega para um ECG. */
  alturaMm?: number;
  /**
   * Quantos pontos desenhar por milímetro.
   *
   * A 25 mm/s e 300 Hz há **12 amostras por milímetro**. Desenhar as 12 é
   * desperdício num papel cuja menor divisão é o próprio milímetro; desenhar
   * menos de uma por milímetro **apaga o QRS**, que é a parte estreita e alta
   * que ninguém pode perder. Quatro é o meio-termo: resolve 0,25 mm.
   */
  pontosPorMm?: number;
}

/**
 * Transforma as amostras no que um papel precisa.
 *
 * Devolve `null` quando não há sinal ou quando a frequência não é utilizável:
 * **sem Hz não há escala de tempo**, e um traçado sem escala de tempo não é um
 * ECG — é um rabisco. Melhor não imprimir do que imprimir uma coisa que se
 * mede errado.
 */
export function tracadoEmPapel(
  amostrasMicroVolts: number[] | null | undefined,
  frequenciaHz: number | null | undefined,
  opcoes: OpcoesDoPapel = {}
): TracadoEmPapel | null {
  const amostras = Array.isArray(amostrasMicroVolts) ? amostrasMicroVolts : [];
  if (amostras.length === 0) return null;
  if (typeof frequenciaHz !== "number" || !Number.isFinite(frequenciaHz) || frequenciaHz <= 0) {
    return null;
  }

  const segundosPorFaixa = opcoes.segundosPorFaixa ?? 10;
  const alturaMm = opcoes.alturaMm ?? 40;
  const pontosPorMm = opcoes.pontosPorMm ?? 4;

  const duracaoSegundos = amostras.length / frequenciaHz;
  const larguraMm = segundosPorFaixa * MM_POR_SEGUNDO;
  const linhaDeBase = alturaMm / 2;

  /*
   * Quantas amostras cabem num ponto desenhado. Nunca menos de uma — com um
   * sinal de baixa frequência, desenhar "meia amostra" não quer dizer nada.
   */
  const amostrasPorPonto = Math.max(
    1,
    Math.round(frequenciaHz / (MM_POR_SEGUNDO * pontosPorMm))
  );

  const amostrasPorFaixa = Math.round(segundosPorFaixa * frequenciaHz);
  const quantasFaixas = Math.ceil(amostras.length / amostrasPorFaixa);
  const faixas: Faixa[] = [];

  for (let f = 0; f < quantasFaixas; f++) {
    const de = f * amostrasPorFaixa;
    const ate = Math.min(de + amostrasPorFaixa, amostras.length);
    const pontos: Array<{ x: number; y: number }> = [];

    for (let i = de; i < ate; i += amostrasPorPonto) {
      const fim = Math.min(i + amostrasPorPonto, ate);
      let soma = 0;
      let n = 0;
      for (let k = i; k < fim; k++) {
        const v = amostras[k];
        if (typeof v === "number" && Number.isFinite(v)) {
          soma += v;
          n++;
        }
      }
      /* Um pedaço todo de lixo não vira zero — vira nada, e a linha salta. */
      if (n === 0) continue;

      const media = soma / n;
      const segundosDesdeOInicioDaFaixa = (i - de) / frequenciaHz;
      pontos.push({
        x: segundosDesdeOInicioDaFaixa * MM_POR_SEGUNDO,
        /*
         * `y` cresce para baixo no papel, e a voltagem cresce para cima no
         * ECG — daí o sinal trocado. Esquecer isto desenha o traçado de
         * cabeça para baixo, e um ECG invertido parece um achado.
         */
        y: linhaDeBase - media * MM_POR_MICROVOLT,
      });
    }

    if (pontos.length > 0) {
      faixas.push({
        inicioSegundos: de / frequenciaHz,
        duracaoSegundos: (ate - de) / frequenciaHz,
        pontos,
      });
    }
  }

  return { faixas, larguraMm, alturaMm, duracaoSegundos, amostrasPorPonto };
}

/**
 * A frase da escala, que vai impressa no papel.
 *
 * **Não é enfeite.** É o que diz a quem lê que pode medir com régua, e qual é a
 * conversão. Um traçado sem esta linha obriga quem o recebe a adivinhar — e,
 * pior, convida a medir com a escala errada.
 */
export function frasePadraoDaEscala(frequenciaHz: number | null | undefined): string {
  const hz = typeof frequenciaHz === "number" && frequenciaHz > 0 ? `${frequenciaHz} Hz` : "?";
  return `Scale: ${MM_POR_SEGUNDO}mm/s, ${MM_POR_MILIVOLT}mm/mV · sampled at ${hz}`;
}

/** Onde a pessoa tinha o aparelho, no código da Withings. */
export const POSICOES: Record<number, { en: string; pt: string }> = {
  0: { en: "Right wrist", pt: "Pulso direito" },
  1: { en: "Left wrist", pt: "Pulso esquerdo" },
  2: { en: "Right arm", pt: "Braço direito" },
  3: { en: "Left arm", pt: "Braço esquerdo" },
  13: { en: "Left hand", pt: "Mão esquerda" },
  14: { en: "Right hand", pt: "Mão direita" },
  30: { en: "Held in the right hand", pt: "Segurado na mão direita" },
  31: { en: "Held in the left hand", pt: "Segurado na mão esquerda" },
};

/**
 * Onde o aparelho estava, por extenso — ou `null`.
 *
 * `null` quando o código não é conhecido, e a tela **omite a linha** em vez de
 * escrever "posição 7". Uma posição inventada no papel de um ECG é pior do que
 * nenhuma: quem lê um traçado precisa de saber de onde ele veio, e um palpite
 * nosso passaria por facto.
 */
export function posicaoPorExtenso(codigo: number | null | undefined): { en: string; pt: string } | null {
  if (typeof codigo !== "number") return null;
  return POSICOES[codigo] ?? null;
}
