/**
 * @jest-environment node
 *
 * Quem lista um ECG e quem o desenha usam a **mesma régua** (120 T-5).
 *
 * ## O achado
 *
 * Duas respostas para a mesma pergunta:
 *
 * - `lib/ecg-tem-sinal.ts` respondia `signal IS NOT NULL` — *"há um JSON lá"*;
 * - `tracadoEmPapel` recusa desenhar com menos de duas amostras numéricas, ou
 *   com amplitude abaixo de `AMPLITUDE_MINIMA_UV`, porque uma reta em papel
 *   milimetrado lê-se como assistolia.
 *
 * Logo um sinal de `[null, null]`, ou um sinal constante, fazia a lista dizer
 * *"tem traçado"* e o papel sair com *"o traçado deste registro ainda não foi
 * obtido"*. É a família de *esconder botão não é fechar porta*: a tela filtrava
 * por um critério e a porta usava outro.
 *
 * ## O que este ficheiro mede, e o que não mede
 *
 * Mede o **predicado** — `sinalEDesenhavel` — e que o `tracadoEmPapel`
 * concorda com ele para o mesmo sinal. É a parte verificável sem banco.
 *
 * A outra metade da régua vive em SQL, dentro do `quaisTemTracado`, porque a
 * resposta não pode custar as 9.000 amostras. Essa foi **medida contra o banco
 * local** em 02/10/2026, nos doze casos deste ficheiro mais uma coluna `null`,
 * um objecto em vez de lista e uma lista vazia — o resultado está no
 * `specs/120-a-falha-que-parece-ausencia/qa/`. Um teste de jest que a
 * exercitasse precisaria de Postgres, e um que lesse o SQL como texto fixaria
 * grafia em vez de comportamento.
 */

import {
  sinalEDesenhavel,
  tracadoEmPapel,
  amostrasMinimas,
  AMPLITUDE_MINIMA_UV,
} from "@/lib/ecg-tracado";

/** Uma onda com pico a pico conhecido, longa o suficiente para dar faixas. */
const onda = (picoUv: number, n = 900) =>
  Array.from({ length: n }, (_, i) => (i % 30 === 0 ? picoUv : 0));

/**
 * As duas respostas, para o mesmo sinal.
 *
 * `temTracado` é o predicado que a lista usa; `papel` é se o PDF desenha. O
 * ponto do ficheiro é que não se separam.
 */
const asDuas = (amostras: Array<number | null>, hz: number | null = 300) => ({
  temTracado: sinalEDesenhavel(amostras, hz),
  papel: tracadoEmPapel(amostras, hz) !== null,
});

describe("as duas respostas são a mesma resposta", () => {
  const casos: Array<[string, Array<number | null>, boolean]> = [
    ["um sinal real", onda(3380), true],
    ["um sinal pequeno mas medível", onda(200), true],
    ["tudo buraco", [null, null, null], false],
    ["uma amostra só, e o resto buracos", [null, 900, null], false],
    ["constante a zero", Array(900).fill(0), false],
    ["constante a 700", Array(900).fill(700), false],
    ["lista vazia", [], false],
    ["amostras negativas de amplitude real", onda(-3380), true],
  ];

  for (const [nome, amostras, esperado] of casos) {
    it(`${nome} → ${esperado ? "tem" : "não tem"} traçado, nos dois lados`, () => {
      const r = asDuas(amostras);
      expect(r.temTracado).toBe(esperado);
      expect(r.papel).toBe(esperado);
    });
  }
});

describe("o limite de amplitude é um e é o mesmo", () => {
  it("**abaixo de 50 µV de ponta a ponta, nenhum dos dois desenha**", () => {
    const quase = onda(AMPLITUDE_MINIMA_UV - 1);
    expect(sinalEDesenhavel(quase, 300)).toBe(false);
    expect(tracadoEmPapel(quase, 300)).toBeNull();
  });

  it("**no limite, os dois desenham**", () => {
    const limite = onda(AMPLITUDE_MINIMA_UV);
    expect(sinalEDesenhavel(limite, 300)).toBe(true);
    expect(tracadoEmPapel(limite, 300)).not.toBeNull();
  });

  it("e a amplitude é de ponta a ponta, não em relação a zero", () => {
    /*
     * Um sinal entre 1.000 e 1.030 µV está longe de zero e **não tem traçado**:
     * 30 µV de excursão não desenham nada. Medir `Math.abs` contra zero daria
     * "tem", e seria uma reta no papel.
     */
    const altoEPlano = Array.from({ length: 900 }, (_, i) => 1000 + (i % 30 === 0 ? 30 : 0));
    expect(sinalEDesenhavel(altoEPlano, 300)).toBe(false);
    expect(tracadoEmPapel(altoEPlano, 300)).toBeNull();
  });
});

describe("o predicado não aceita o que não é sinal", () => {
  it("nem `null`, nem `undefined`, nem o que não é lista", () => {
    expect(sinalEDesenhavel(null, 300)).toBe(false);
    expect(sinalEDesenhavel(undefined, 300)).toBe(false);
    expect(sinalEDesenhavel({ a: 1 } as any, 300)).toBe(false);
    expect(sinalEDesenhavel("9000" as any, 300)).toBe(false);
  });

  it("e um `NaN` ou um `Infinity` não contam como amostra", () => {
    expect(sinalEDesenhavel([NaN, NaN] as any, 300)).toBe(false);
    expect(sinalEDesenhavel([0, Infinity] as any, 300)).toBe(false);
    expect(sinalEDesenhavel([0, NaN] as any, 300)).toBe(false);
  });

  it("**sem frequência, nenhum dos dois desenha** — nem com sinal bom", () => {
    /*
     * Eu tinha chamado a isto *"a única assimetria legítima"*: o predicado não
     * via a frequência, dizia que sim, e o papel dizia que não. O QA mostrou
     * que a assimetria **é** o defeito — um ECG com `samplingHz` nulo e 9.000
     * amostras boas aparecia na lista como tendo traçado, e o paciente tocava
     * para receber *"o traçado ainda não foi obtido"*.
     *
     * Um ECG sem escala de tempo não é mensurável com régua. Os dois recusam.
     */
    const bom = onda(3380);
    expect(sinalEDesenhavel(bom, null)).toBe(false);
    expect(sinalEDesenhavel(bom, 0)).toBe(false);
    expect(sinalEDesenhavel(bom, undefined)).toBe(false);
    expect(tracadoEmPapel(bom, null)).toBeNull();
    expect(tracadoEmPapel(bom, 0)).toBeNull();
  });
});

describe("o degrau das amostras é o mesmo nos dois lados", () => {
  /**
   * **O achado F3 do QA.** A régua pedia 2 amostras; o papel, a 300 Hz, come 3
   * por coluna e precisa de 2 colunas — ou seja, 6. Entre 2 e 5 amostras os
   * dois discordavam, e `pico50`, `pico51` e `negativas` caíam lá.
   */
  const comAmplitude = (n: number) =>
    Array.from({ length: n }, (_, i) => (i % 2 === 0 ? 0 : 1000));

  it("**a 300 Hz o degrau é 6 amostras, nos dois**", () => {
    expect(amostrasMinimas(300)).toBe(6);
    for (let n = 1; n <= 12; n++) {
      const amostras = comAmplitude(n);
      expect(sinalEDesenhavel(amostras, 300)).toBe(tracadoEmPapel(amostras, 300) !== null);
    }
  });

  it("**e a 500 Hz é 10** — a conta vem da frequência, não de um número fixo", () => {
    expect(amostrasMinimas(500)).toBe(10);
    for (let n = 1; n <= 16; n++) {
      const amostras = comAmplitude(n);
      expect(sinalEDesenhavel(amostras, 500)).toBe(tracadoEmPapel(amostras, 500) !== null);
    }
  });

  it("os três casos que o QA apanhou passam a concordar", () => {
    for (const amostras of [[0, 50], [0, 51], [-621, 3380]]) {
      expect(sinalEDesenhavel(amostras, 300)).toBe(false);
      expect(tracadoEmPapel(amostras, 300)).toBeNull();
    }
  });
});
