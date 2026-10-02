/**
 * A tendência de uma métrica, em barras (118 T-9).
 *
 * ## Porque barras, e não a linha do relatório
 *
 * Porque **`react-native-svg` não está instalado**, e acrescentá-lo é um módulo
 * nativo novo — o que muda o *fingerprint* e faz o `eas update` deixar de chegar
 * aos binários já instalados. O mesmo motivo pelo qual o traçado do ECG é
 * desenhado no servidor.
 *
 * E a restrição produz o visual mais honesto. Numa série com buracos, **uma
 * barra que falta é inequívoca**: não há sequer a pergunta de atravessar ou não
 * o dia sem dado, que foi a decisão mais delicada do gráfico do papel. O que lá
 * foi preciso defender com uma regra, aqui é a forma.
 *
 * ## O que isto não faz
 *
 * Não decide cor, não decide largura, não sabe o que é "bom". Devolve alturas
 * entre 0 e 1 e diz quais os dias que não têm barra. Quem desenha é a tela, e o
 * que a tela faz não é verificável nesta base — por isso a conta vive aqui.
 */

export interface PontoDaSerie {
  dia: string;
  valor: number | null;
}

export interface Barra {
  dia: string;
  /** `null` quando não houve medição nesse dia — a barra não se desenha. */
  altura: number | null;
  valor: number | null;
}

export interface Tendencia {
  barras: Barra[];
  minimo: number;
  maximo: number;
  /** Quantos dias têm medição. */
  dias: number;
}

/**
 * Quantos dias com dado são precisos para mostrar a tendência.
 *
 * **Dois.** Uma barra sozinha não é tendência nenhuma, e desenhá-la ao lado de
 * seis espaços vazios sugere uma série que não existe — o número grande acima já
 * diz o que há.
 */
export const MINIMO_DE_DIAS = 2;

/**
 * A série em barras — ou `null` quando não há o que mostrar.
 *
 * `null` quer dizer *"não desenhes caixa nenhuma"*. Um gráfico vazio debaixo de
 * um número lê-se como "medimos e deu isto", quando o que houve foi não haver
 * medida.
 */
export function tendenciaEmBarras(
  serie: PontoDaSerie[] | null | undefined,
  /**
   * Quantos dias mostrar, do mais recente para trás. Menos barras num cartão
   * pequeno lêem-se melhor do que noventa fios de um pixel.
   */
  quantosDias = 14
): Tendencia | null {
  if (!Array.isArray(serie) || serie.length === 0) return null;

  const validos = serie
    .filter((p) => typeof p?.dia === "string" && !Number.isNaN(Date.parse(p.dia + "T00:00:00Z")))
    .sort((a, b) => a.dia.localeCompare(b.dia));
  if (validos.length === 0) return null;

  /*
   * **Uma barra por dia da janela, e não por dia com dado.**
   *
   * Sete barras para sete dias. Tirar o dia sem medição encolheria tudo o que
   * vem depois para a esquerda — o mesmo erro que encurtou uma gravação de ECG
   * de 30 s para 29,003 s, e que aqui faria "há três dias" parecer "ontem".
   */
  const ultimo = validos[validos.length - 1].dia;
  const base = Date.parse(ultimo + "T00:00:00Z");
  const porDia = new Map(validos.map((p) => [p.dia, p.valor]));

  const janela: Array<{ dia: string; valor: number | null }> = [];
  for (let i = quantosDias - 1; i >= 0; i--) {
    const d = new Date(base - i * 86_400_000).toISOString().slice(0, 10);
    const v = porDia.get(d);
    janela.push({ dia: d, valor: typeof v === "number" && Number.isFinite(v) ? v : null });
  }

  const comDado = janela.filter((p): p is { dia: string; valor: number } => p.valor !== null);
  if (comDado.length < MINIMO_DE_DIAS) return null;

  const minimo = Math.min(...comDado.map((p) => p.valor));
  const maximo = Math.max(...comDado.map((p) => p.valor));
  const amplitude = maximo - minimo;

  return {
    barras: janela.map((p) => ({
      dia: p.dia,
      valor: p.valor,
      /*
       * A altura é relativa ao **próprio período**, e os limites são escritos ao
       * lado. Uma barra cheia não quer dizer "bom": quer dizer "o maior destes
       * dias".
       *
       * Com amplitude zero — todos os dias iguais — fica a meio. Pô-las todas
       * cheias leria como "no máximo todos os dias"; vazias, o contrário. A meio
       * é o que foi: não variou.
       *
       * E o mínimo não fica a zero: uma barra de altura nenhuma é
       * indistinguível de um dia sem medição, que é exactamente a coisa que
       * estas barras existem para separar.
       */
      altura:
        p.valor === null
          ? null
          : amplitude === 0
            ? 0.5
            : 0.15 + 0.85 * ((p.valor - minimo) / amplitude),
    })),
    minimo,
    maximo,
    dias: comDado.length,
  };
}
