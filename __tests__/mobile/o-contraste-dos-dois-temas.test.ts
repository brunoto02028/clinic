/**
 * @jest-environment node
 *
 * O contraste de cada tinta sobre cada superfície, nos dois temas.
 *
 * ## Porque isto existe, e porque a primeira versão não bastou
 *
 * Em 118 T-10 mudei a paleta inteira — o escuro foi para quase preto e o claro
 * recuou um degrau para o cartão flutuar. A primeira versão deste teste media
 * **três** tintas (o texto e os seus dois tons) e dava tudo verde. O review
 * mediu as onze e achou cinco reprovadas: `health` 4,37, `community` 4,19,
 * `labWarm` 4,31, `ok` 4,47, `warn` 4,43 — as cores do preço do exame, do
 * número do resultado e de cada rótulo de pilar.
 *
 * Um guarda que mede três de onze não é um guarda: é a parte do problema que
 * eu já sabia que existia. Então mede-se **toda** a tinta contra **toda**
 * superfície, nos dois temas.
 *
 * E já aconteceu o pior caso: numa troca de cor anterior eu baixei o contraste
 * de 4,9 para 3,2 **a anunciar que estava a melhorar**, porque medi o resultado
 * e não o ponto de partida.
 *
 * ## O que se exige
 *
 * **4,5:1**, o mínimo da WCAG AA para texto corrido — e o número que o próprio
 * tema diz perseguir, porque é o que alguém de sessenta anos com dor consegue
 * ler. Para o que não é texto (a aresta do cartão, o rebaixo do controle
 * segmentado, o trilho do anel) o que se exige é **1,15**: pouco para ler
 * letras, o suficiente para a forma existir. O que não pode é ser 1,00.
 */

import { themes } from "../../mobile/src/theme";

const PISO_DO_TEXTO = 4.5;
const PISO_DA_FORMA = 1.15;

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function luminancia(hex: string): number {
  const canal = (v: number) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = rgb(hex).map(canal) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(a: string, b: string): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Compara o medido com o exigido **num objeto**, para a falha do Jest imprimir
 * o par e o número.
 *
 * A primeira versão fazia `expect({par, contraste}).toEqual({par, contraste})`
 * — o objeto contra ele mesmo, que nunca falha e portanto nunca imprime nada.
 * Aqui o `passa` é comparado com `true`, e é isso que o diff mostra.
 */
function exige(par: string, medido: number, piso: number) {
  expect({ par, contraste: Number(medido.toFixed(2)), passa: medido >= piso }).toEqual({
    par,
    contraste: Number(medido.toFixed(2)),
    passa: true,
  });
}

/** Toda a tinta que o app escreve. */
const TINTAS = [
  "text",
  "textSecondary",
  "textMuted",
  "secondary",
  "work",
  "health",
  "community",
  "lab",
  "labWarm",
  "ok",
  "warn",
  "bad",
  "danger",
  "success",
  "agendaLivre",
] as const;

/** Toda a superfície em que ela aparece. */
const FUNDOS = ["background", "surface", "surfaceElevated", "surfaceMuted"] as const;

/**
 * As três que o `surfaceMuted` do tema claro não passa — **e que não vêm desta
 * mudança**.
 *
 * `surfaceMuted` (#EBEAE6) e estas três tintas estão como estavam: `health`
 * 4,41, `labWarm` 4,35, `warn` 4,47. Fica escrito em vez de medido-por-cima
 * porque consertar é escolher entre escurecer três cores de marca ou clarear
 * uma superfície usada em 75 sítios — e essa é uma decisão do Bruno, não um
 * conserto meu de passagem.
 *
 * **Esta lista só pode encolher.** Uma tinta nova a cair aqui parte o teste.
 */
const DIVIDA_ANTIGA = new Set(["claro/health/surfaceMuted", "claro/labWarm/surfaceMuted", "claro/warn/surfaceMuted"]);

describe("a régua está calibrada", () => {
  it("**preto sobre branco dá 21, branco sobre branco dá 1**", () => {
    /*
     * Sem isto, um erro na fórmula faria o teste inteiro passar a dizer que
     * está tudo bem — que é o modo de falhar mais caro que um guarda tem.
     */
    expect(contraste("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
    expect(contraste("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
  });
});

describe.each([
  ["claro", themes.light],
  ["escuro", themes.dark],
])("o tema %s é legível em cada superfície", (nome, tema) => {
  for (const fundo of FUNDOS) {
    for (const tinta of TINTAS) {
      const par = `${nome}/${tinta}/${fundo}`;
      it(`**${tinta} sobre ${fundo}**`, () => {
        const c = contraste(tema[tinta] as string, tema[fundo] as string);
        if (DIVIDA_ANTIGA.has(par)) {
          /* Dívida conhecida: exige-se que não piore, não que passe. */
          expect(c).toBeGreaterThanOrEqual(4.3);
          return;
        }
        exige(par, c, PISO_DO_TEXTO);
      });
    }
  }
});

describe.each([
  ["claro", themes.light],
  ["escuro", themes.dark],
])("no tema %s cada forma existe", (nome, tema) => {
  /**
   * Um cartão que não se distingue do fundo não é um cartão — e foi medir isto
   * que mostrou que translucidez no tema claro **aproximava** o cartão do fundo
   * em vez de o separar.
   */
  it("**o cartão separa-se do fundo**", () => {
    exige(`${nome}/surface/background`, contraste(tema.surface as string, tema.background as string), PISO_DA_FORMA);
  });

  /**
   * O trilho do controle segmentado aparece nos dois sítios: solto no fundo da
   * tela no claro, dentro de um cartão no escuro. Dava **1,01** contra o fundo
   * claro novo e **1,05** contra o cartão escuro novo — nos dois casos o
   * controle deixava de existir e ficavam duas palavras soltas.
   */
  it("**o rebaixo do segmento existe nos dois sítios**", () => {
    exige(`${nome}/segmentTrack/background`, contraste(tema.segmentTrack as string, tema.background as string), PISO_DA_FORMA);
    exige(`${nome}/segmentTrack/surface`, contraste(tema.segmentTrack as string, tema.surface as string), PISO_DA_FORMA);
    exige(`${nome}/segmentThumb/segmentTrack`, contraste(tema.segmentThumb as string, tema.segmentTrack as string), PISO_DA_FORMA);
  });

  it("**e os rótulos do segmento leem-se**", () => {
    exige(`${nome}/textMuted/segmentTrack`, contraste(tema.textMuted as string, tema.segmentTrack as string), PISO_DO_TEXTO);
    exige(`${nome}/text/segmentThumb`, contraste(tema.text as string, tema.segmentThumb as string), PISO_DO_TEXTO);
  });

  /**
   * `border` é o trilho do anel de meta, e é ele o **único** sinal de "sem
   * meta" — um anel vazio que não se vê deixa um travessão solto no meio do
   * nada. Com `borderSubtle` dava 1,10 contra o cartão escuro; é por isso que
   * o anel usa `border`.
   */
  it("**o trilho do anel vê-se contra o cartão e contra o fundo**", () => {
    exige(`${nome}/border/surface`, contraste(tema.border as string, tema.surface as string), PISO_DA_FORMA);
    exige(`${nome}/border/background`, contraste(tema.border as string, tema.background as string), PISO_DA_FORMA);
  });
});
