/**
 * @jest-environment node
 *
 * O traçado mede certo (099 T-9).
 *
 * ## Porque um teste de aritmética aqui vale mais do que um de aparência
 *
 * Um ECG impresso é um **instrumento de medida**. Quem o recebe põe uma régua
 * em cima e conta quadradinhos para ler o PR, o QRS e o QT. Isso só funciona na
 * escala convencional: **25 mm/s** e **10 mm/mV** — a mesma que o rodapé do PDF
 * da Withings declara.
 *
 * Um traçado desenhado "para caber bonito" não parece errado. Parece um ECG, e
 * mede errado **em silêncio**. É pior do que não imprimir, porque passa por
 * facto na mão de quem decide.
 *
 * Por isso aqui mede-se a conta, e não o desenho:
 *
 * - um segundo ocupa 25 mm;
 * - um milivolt sobe 10 mm — e as amostras vêm em **micro-volts**, logo 1 µV é
 *   0,01 mm. Tratá-las como milivolts dava um traçado mil vezes maior;
 * - a voltagem sobe no papel e o `y` desce no desenho, portanto o sinal
 *   inverte-se. Esquecer isso desenha o ECG de cabeça para baixo, e um ECG
 *   invertido parece um achado.
 */

import {
  tracadoEmPapel,
  frasePadraoDaEscala,
  posicaoPorExtenso,
  MM_POR_SEGUNDO,
  MM_POR_MILIVOLT,
} from "../../lib/ecg-tracado";

/** Um sinal plano de `n` segundos a `hz`, todo no valor `uv`. */
const plano = (segundos: number, hz: number, uv = 0) =>
  Array.from({ length: Math.round(segundos * hz) }, () => uv);

describe("a escala é a convencional", () => {
  it("**um segundo ocupa 25 mm**", () => {
    expect(MM_POR_SEGUNDO).toBe(25);
    const t = tracadoEmPapel(plano(10, 300), 300, { segundosPorFaixa: 10 })!;
    expect(t.larguraMm).toBe(250);
  });

  it("**um milivolt sobe 10 mm** — e as amostras são micro-volts", () => {
    expect(MM_POR_MILIVOLT).toBe(10);
    /*
     * 1000 µV = 1 mV = 10 mm acima da linha de base. Numa faixa de 40 mm a
     * base está a 20 mm, logo o ponto cai em 20 − 10 = 10.
     */
    const t = tracadoEmPapel(plano(1, 300, 1000), 300, { segundosPorFaixa: 10, alturaMm: 40 })!;
    expect(t.faixas[0].pontos[0].y).toBeCloseTo(10, 6);
  });

  it("um sinal nulo fica exactamente na linha de base", () => {
    const t = tracadoEmPapel(plano(1, 300, 0), 300, { alturaMm: 40 })!;
    for (const p of t.faixas[0].pontos) expect(p.y).toBeCloseTo(20, 6);
  });

  it("**a voltagem sobe e o `y` desce** — o traçado não sai invertido", () => {
    const t = tracadoEmPapel([500, -500], 300, { alturaMm: 40, pontosPorMm: 100 })!;
    const [a, b] = t.faixas[0].pontos;
    expect(a.y).toBeLessThan(20); // +0,5 mV acima da base
    expect(b.y).toBeGreaterThan(20); // −0,5 mV abaixo
  });

  it("meio milivolt sobe metade", () => {
    const t = tracadoEmPapel(plano(1, 300, 500), 300, { alturaMm: 40 })!;
    expect(t.faixas[0].pontos[0].y).toBeCloseTo(15, 6);
  });
});

describe("as faixas", () => {
  it("**trinta segundos dão três faixas de dez**", () => {
    // 750 mm não cabem numa folha; é por isso que o papel deles tem três.
    const t = tracadoEmPapel(plano(30, 300), 300, { segundosPorFaixa: 10 })!;
    expect(t.faixas).toHaveLength(3);
    expect(t.duracaoSegundos).toBeCloseTo(30, 6);
    for (const f of t.faixas) expect(f.duracaoSegundos).toBeCloseTo(10, 6);
  });

  it("cada faixa sabe em que segundo começa", () => {
    const t = tracadoEmPapel(plano(30, 300), 300, { segundosPorFaixa: 10 })!;
    expect(t.faixas.map((f) => f.inicioSegundos)).toEqual([0, 10, 20]);
  });

  it("**o x reinicia em cada faixa**, senão a segunda sai fora do papel", () => {
    const t = tracadoEmPapel(plano(30, 300), 300, { segundosPorFaixa: 10 })!;
    for (const f of t.faixas) {
      expect(f.pontos[0].x).toBeCloseTo(0, 6);
      expect(f.pontos[f.pontos.length - 1].x).toBeLessThanOrEqual(250);
    }
  });

  it("uma gravação curta dá uma faixa curta, e não uma faixa cheia de vazio", () => {
    const t = tracadoEmPapel(plano(3, 300), 300, { segundosPorFaixa: 10 })!;
    expect(t.faixas).toHaveLength(1);
    expect(t.faixas[0].duracaoSegundos).toBeCloseTo(3, 6);
    expect(t.faixas[0].pontos[t.faixas[0].pontos.length - 1].x).toBeLessThan(80);
  });
});

describe("a redução de pontos", () => {
  it("**diz quantas amostras entraram em cada ponto**", () => {
    // A 300 Hz e 4 pontos/mm: 300 / (25 × 4) = 3 amostras por ponto.
    const t = tracadoEmPapel(plano(10, 300), 300, { pontosPorMm: 4 })!;
    expect(t.amostrasPorPonto).toBe(3);
  });

  it("nunca junta menos de uma amostra", () => {
    const t = tracadoEmPapel(plano(10, 50), 50, { pontosPorMm: 10 })!;
    expect(t.amostrasPorPonto).toBe(1);
  });

  it("**um pedaço todo inválido não vira zero** — vira ponto nenhum", () => {
    /*
     * Um zero inventado desenha uma linha a passar pela base, que num ECG é
     * exactamente o que uma assistolia parece. Melhor um buraco do que um
     * achado inventado.
     */
    const t = tracadoEmPapel([NaN, NaN, NaN, 1000, 1000, 1000], 300, { pontosPorMm: 4 })!;
    expect(t.faixas[0].pontos).toHaveLength(1);
    expect(t.faixas[0].pontos[0].y).toBeLessThan(20);
  });
});

describe("sem escala não se imprime", () => {
  it("**sem frequência não há traçado** — um ECG sem escala de tempo não é um ECG", () => {
    expect(tracadoEmPapel(plano(10, 300), null)).toBeNull();
    expect(tracadoEmPapel(plano(10, 300), 0)).toBeNull();
    expect(tracadoEmPapel(plano(10, 300), -300)).toBeNull();
    expect(tracadoEmPapel(plano(10, 300), NaN)).toBeNull();
  });

  it("sem amostras também não", () => {
    expect(tracadoEmPapel([], 300)).toBeNull();
    expect(tracadoEmPapel(null, 300)).toBeNull();
    expect(tracadoEmPapel(undefined, 300)).toBeNull();
  });

  it("**a frase da escala vai no papel**, com a frequência real", () => {
    expect(frasePadraoDaEscala(300)).toBe("Scale: 25mm/s, 10mm/mV · sampled at 300 Hz");
    expect(frasePadraoDaEscala(500)).toContain("500 Hz");
  });

  it("sem frequência, a frase não inventa uma", () => {
    expect(frasePadraoDaEscala(null)).toContain("?");
    expect(frasePadraoDaEscala(null)).not.toMatch(/\d+ Hz/);
  });
});

describe("de onde o ECG foi tirado", () => {
  it("**`1` é pulso esquerdo** — o que o papel deles imprime", () => {
    expect(posicaoPorExtenso(1)).toEqual({ en: "Left wrist", pt: "Pulso esquerdo" });
  });

  it("**um código desconhecido não vira uma posição inventada**", () => {
    // Um palpite nosso no papel de um ECG passaria por facto a quem o lê.
    expect(posicaoPorExtenso(7)).toBeNull();
    expect(posicaoPorExtenso(99)).toBeNull();
    expect(posicaoPorExtenso(null)).toBeNull();
    expect(posicaoPorExtenso(undefined)).toBeNull();
  });
});

describe("o caso real do Bruno", () => {
  /*
   * 9.000 amostras a 300 Hz — exactamente o que a API devolveu em 02/10/2026
   * para a gravação das 23:54 de 01/10.
   */
  const amostras = Array.from({ length: 9000 }, (_, i) =>
    // uma onda simples só para haver forma; o que se mede aqui é a geometria
    Math.round(400 * Math.sin((i / 300) * 2 * Math.PI))
  );

  it("**dá 30 segundos em três faixas**", () => {
    const t = tracadoEmPapel(amostras, 300, { segundosPorFaixa: 10 })!;
    expect(t.duracaoSegundos).toBeCloseTo(30, 6);
    expect(t.faixas).toHaveLength(3);
  });

  it("e cabe em 250 mm de largura — o que sobra numa A4 deitada", () => {
    const t = tracadoEmPapel(amostras, 300, { segundosPorFaixa: 10 })!;
    expect(t.larguraMm).toBe(250);
    expect(t.larguraMm).toBeLessThan(297 - 20); // A4 deitada, com margens
  });

  it("**o traçado inteiro fica dentro da altura da faixa**", () => {
    // ±400 µV são ±4 mm; numa faixa de 40 mm sobra muito. Se não coubesse, o
    // traçado seria cortado no papel sem nada a dizer que foi.
    const t = tracadoEmPapel(amostras, 300, { alturaMm: 40 })!;
    for (const f of t.faixas) {
      for (const p of f.pontos) {
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(40);
      }
    }
  });
});
