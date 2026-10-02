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
 *
 * ## Os quatro defeitos que esta versão dos testes existe para prender
 *
 * Medidos no review de 02/10/2026, todos da mesma família — **parece um ECG e
 * mede errado sem dizer nada**:
 *
 * 1. as amostras inválidas eram **apagadas**, e isso adiantava tudo o que vinha
 *    depois: 299 buracos em 9.000 encurtavam 30 s para 29,003 s com o papel a
 *    continuar a declarar 300 Hz;
 * 2. cada coluna desenhava a **média** de 3 amostras, e uma espiga de 1,5 mV
 *    saía impressa a 0,5 mV — um terço da altura real;
 * 3. o que não cabia era desenhado **fora da faixa**, por cima do cabeçalho e
 *    por cima da faixa de cima, inventando onda onde não houve nenhuma;
 * 4. uma amostra só devolvia um traçado **sem colunas**, e o PDF imprimia
 *    grelha e escala sem traçado e sem aviso.
 */

import {
  tracadoEmPapel,
  frasePadraoDaEscala,
  posicaoPorExtenso,
  MM_POR_SEGUNDO,
  MM_POR_MILIVOLT,
  AMPLITUDE_MINIMA_UV,
} from "../../lib/ecg-tracado";

/** Um sinal plano de `n` segundos a `hz`, todo no valor `uv`. */
const plano = (segundos: number, hz: number, uv = 0): Array<number | null> =>
  Array.from({ length: Math.round(segundos * hz) }, () => uv);

/**
 * Uma onda de 1 Hz com amplitude de `uv`.
 *
 * É este, e não o sinal plano, que serve para medir geometria: **um sinal plano
 * já não produz traçado**, e com razão — ver o bloco "uma reta não é um
 * traçado". Usar `plano` para medir faixas e largura dava `null` e escondia a
 * medida atrás de um `!`.
 */
const onda = (segundos: number, hz: number, uv = 400): Array<number | null> =>
  Array.from({ length: Math.round(segundos * hz) }, (_, i) =>
    Math.round(uv * Math.sin((i / hz) * 2 * Math.PI))
  );

describe("a escala é a convencional", () => {
  it("**um segundo ocupa 25 mm**", () => {
    expect(MM_POR_SEGUNDO).toBe(25);
    const t = tracadoEmPapel(onda(10, 300), 300, { segundosPorFaixa: 10 })!;
    expect(t.larguraMm).toBe(250);
  });

  it("**um milivolt sobe 10 mm** — e as amostras são micro-volts", () => {
    expect(MM_POR_MILIVOLT).toBe(10);
    /*
     * 1000 µV = 1 mV = 10 mm acima da linha de base. Numa faixa de 40 mm a
     * base está a 20 mm, logo a coluna cai em 20 − 10 = 10.
     *
     * Uma amostra por coluna (`pontosPorMm` alto) para que a coluna seja a
     * amostra, sem o envelope a juntar vizinhos.
     */
    const t = tracadoEmPapel([1000, 0], 300, { alturaMm: 40, pontosPorMm: 100 })!;
    expect(t.faixas[0].colunas[0].yMin).toBeCloseTo(10, 6);
  });

  it("**zero fica exactamente na linha de base**", () => {
    const t = tracadoEmPapel([0, 500], 300, { alturaMm: 40, pontosPorMm: 100 })!;
    expect(t.faixas[0].colunas[0].yMin).toBeCloseTo(20, 6);
    expect(t.faixas[0].colunas[0].yMax).toBeCloseTo(20, 6);
  });

  it("**a voltagem sobe e o `y` desce** — o traçado não sai invertido", () => {
    const t = tracadoEmPapel([500, -500], 300, { alturaMm: 40, pontosPorMm: 100 })!;
    const [a, b] = t.faixas[0].colunas;
    expect(a.yMin!).toBeLessThan(20); // +0,5 mV acima da base
    expect(b.yMin!).toBeGreaterThan(20); // −0,5 mV abaixo
  });

  it("meio milivolt sobe metade", () => {
    const t = tracadoEmPapel([500, 0], 300, { alturaMm: 40, pontosPorMm: 100 })!;
    expect(t.faixas[0].colunas[0].yMin).toBeCloseTo(15, 6);
  });
});

describe("uma reta não é um traçado", () => {
  /**
   * O achado do QA de 02/10/2026, medido **por dentro do PDF**: um sinal todo a
   * zeros saía como três faixas de papel milimetrado com uma linha
   * perfeitamente reta, debaixo de *"Ritmo sinusal"*, com `25mm/s, 10mm/mV`
   * declarado e **nenhuma ressalva** — `"not been retrieved": 0`,
   * `avisos (clip|flat|zero|constant): 0`.
   *
   * Em papel de ECG isso lê-se como assistolia. E é alcançável: a ingestão só
   * descarta o que não é número, e `0` é número — passa o filtro, passa o
   * `amostras.length > 0`, e é guardado como traçado legítimo.
   */
  it("**tudo a zeros não é traçado**", () => {
    expect(tracadoEmPapel(plano(30, 300, 0), 300)).toBeNull();
  });

  it("**e tudo no mesmo valor também não** — a reta não precisa de ser no zero", () => {
    // Uma reta a 10 mm da base é tão enganadora como uma reta na base.
    expect(tracadoEmPapel(plano(30, 300, 1000), 300)).toBeNull();
    expect(tracadoEmPapel(plano(30, 300, -800), 300)).toBeNull();
  });

  it("meia divisão da grelha ainda não chega", () => {
    expect(AMPLITUDE_MINIMA_UV).toBe(50); // 0,5 mm: metade do menor quadradinho
    const quase: Array<number | null> = Array.from({ length: 900 }, (_, i) =>
      i % 2 === 0 ? 0 : AMPLITUDE_MINIMA_UV - 1
    );
    expect(tracadoEmPapel(quase, 300)).toBeNull();
  });

  it("e um pelinho acima já é um traçado", () => {
    const basta: Array<number | null> = Array.from({ length: 900 }, (_, i) =>
      i % 2 === 0 ? 0 : AMPLITUDE_MINIMA_UV
    );
    expect(tracadoEmPapel(basta, 300)).not.toBeNull();
  });

  it("**a amplitude é de ponta a ponta, não distância ao zero**", () => {
    /*
     * Um sinal a oscilar entre 2000 e 2010 µV tem picos grandes e movimento
     * nenhum. Medir `Math.abs` contra o zero deixava-o passar.
     */
    const alto: Array<number | null> = Array.from({ length: 900 }, (_, i) =>
      i % 2 === 0 ? 2000 : 2010
    );
    expect(tracadoEmPapel(alto, 300)).toBeNull();
  });
});

describe("as faixas", () => {
  it("**trinta segundos dão três faixas de dez**", () => {
    // 750 mm não cabem numa folha; é por isso que o papel deles tem três.
    const t = tracadoEmPapel(onda(30, 300), 300, { segundosPorFaixa: 10 })!;
    expect(t.faixas).toHaveLength(3);
    expect(t.duracaoSegundos).toBeCloseTo(30, 6);
    for (const f of t.faixas) expect(f.duracaoSegundos).toBeCloseTo(10, 6);
  });

  it("cada faixa sabe em que segundo começa", () => {
    const t = tracadoEmPapel(onda(30, 300), 300, { segundosPorFaixa: 10 })!;
    expect(t.faixas.map((f) => f.inicioSegundos)).toEqual([0, 10, 20]);
  });

  it("**o x reinicia em cada faixa**, senão a segunda sai fora do papel", () => {
    const t = tracadoEmPapel(onda(30, 300), 300, { segundosPorFaixa: 10 })!;
    for (const f of t.faixas) {
      expect(f.colunas[0].x).toBeCloseTo(0, 6);
      expect(f.colunas[f.colunas.length - 1].x).toBeLessThanOrEqual(250);
    }
  });

  it("uma gravação curta dá uma faixa curta, e não uma faixa cheia de vazio", () => {
    const t = tracadoEmPapel(onda(3, 300), 300, { segundosPorFaixa: 10 })!;
    expect(t.faixas).toHaveLength(1);
    expect(t.faixas[0].duracaoSegundos).toBeCloseTo(3, 6);
    expect(t.faixas[0].colunas[t.faixas[0].colunas.length - 1].x).toBeLessThan(80);
  });
});

describe("a redução de pontos", () => {
  it("**diz quantas amostras entraram em cada ponto**", () => {
    // A 300 Hz e 4 pontos/mm: 300 / (25 × 4) = 3 amostras por ponto.
    const t = tracadoEmPapel(onda(10, 300), 300, { pontosPorMm: 4 })!;
    expect(t.amostrasPorPonto).toBe(3);
  });

  it("nunca junta menos de uma amostra", () => {
    const t = tracadoEmPapel(onda(10, 50), 50, { pontosPorMm: 10 })!;
    expect(t.amostrasPorPonto).toBe(1);
  });

  it("**um buraco não vira zero — e não encolhe o tempo**", () => {
    /*
     * Um zero inventado desenha uma linha a passar pela base, que num ECG é o
     * que uma assistolia parece. E apagar a amostra era pior: adiantava tudo o
     * que vinha depois, porque o tempo sai do índice.
     *
     * O `null` entra aqui porque é isso que a ingestão guarda — ver
     * `lib/withings-series.ts`. Um `NaN` não sobrevive ao JSON do banco, logo
     * testá-lo sozinho seria testar um estado que o banco não produz.
     */
    const amostras: Array<number | null> = [null, null, null, 1000, 1000, 1000, 0, 0, 0];
    const t = tracadoEmPapel(amostras, 300, { pontosPorMm: 4, alturaMm: 40 })!;
    expect(t.amostrasPorPonto).toBe(3);
    expect(t.faixas[0].colunas).toHaveLength(3);

    /* A primeira coluna é buraco: existe no tempo, e não desenha. */
    expect(t.faixas[0].colunas[0].yMin).toBeNull();
    expect(t.faixas[0].colunas[0].yMax).toBeNull();
    expect(t.faixas[0].colunas[0].x).toBeCloseTo(0, 6);

    /* E a segunda está na sua hora — não foi puxada para trás. */
    expect(t.faixas[0].colunas[1].x).toBeCloseTo((3 / 300) * MM_POR_SEGUNDO, 6);
    expect(t.faixas[0].colunas[1].yMin).toBeCloseTo(10, 6);
  });

  it("**uma coluna desenhável no meio de buracos não é um traçado**", () => {
    /*
     * Uma linha precisa de dois pontos. Um sinal que só tem um ponto bom
     * desenharia um risco vertical no meio de uma folha com escala e grelha, e
     * essa folha lê-se como um ECG — um ECG quase todo em linha reta.
     */
    const so_um: Array<number | null> = [null, null, null, 1000, 0, -1000];
    expect(tracadoEmPapel(so_um, 300, { pontosPorMm: 4 })).toBeNull();
  });

  it("**os buracos não encurtam a gravação**", () => {
    /*
     * O número do review: 299 amostras inválidas em 9.000. A duração declarada
     * tem de continuar a ser 30 s, porque o relógio gravou 30 s — senão um
     * intervalo RR medido à régua por cima do buraco sai curto, e nada no papel
     * denuncia.
     */
    const amostras: Array<number | null> = Array.from({ length: 9000 }, (_, i) =>
      Math.round(400 * Math.sin((i / 300) * 2 * Math.PI))
    );
    for (let i = 0; i < 299; i++) amostras[i * 7] = null;

    const t = tracadoEmPapel(amostras, 300, { segundosPorFaixa: 10 })!;
    expect(t.duracaoSegundos).toBeCloseTo(30, 6);
    expect(t.faixas).toHaveLength(3);
    expect(t.faixas.map((f) => f.inicioSegundos)).toEqual([0, 10, 20]);
  });
});

describe("a espiga não é achatada", () => {
  /**
   * A 300 Hz cada coluna junta **três** amostras, e a versão anterior desenhava
   * a **média** delas. Um QRS de 1,5 mV com uma amostra de duração saía impresso
   * a 0,5 mV: **um terço** da altura real.
   *
   * Quem mede elevação de ST ou altura de R com uma régua lia um valor
   * atenuado, e o rodapé do papel afirmava que continuava a medir certo. Certo
   * no tempo; errado na amplitude.
   */
  const comEspiga = (picoUv: number): Array<number | null> => {
    const a: Array<number | null> = Array.from({ length: 300 }, () => 0);
    a[150] = picoUv; // uma amostra só, como um QRS estreito
    return a;
  };

  it("**uma espiga de 1,5 mV chega ao papel com 15 mm**, não com 5", () => {
    const t = tracadoEmPapel(comEspiga(1500), 300, { alturaMm: 40, pontosPorMm: 4 })!;
    expect(t.amostrasPorPonto).toBe(3); // a média de 3 é que achatava
    const topo = Math.min(...t.faixas[0].colunas.map((c) => c.yMin ?? Infinity));
    /* 20 (base) − 15 (1,5 mV × 10 mm/mV) = 5 */
    expect(topo).toBeCloseTo(5, 6);
  });

  it("e a coluna mostra **o mínimo e o máximo**, não um valor só", () => {
    const t = tracadoEmPapel([0, 1000, -1000, 0, 0, 0], 300, { alturaMm: 40, pontosPorMm: 4 })!;
    const c = t.faixas[0].colunas[0];
    expect(c.yMin).toBeCloseTo(10, 6); // +1 mV, em cima
    expect(c.yMax).toBeCloseTo(30, 6); // −1 mV, em baixo
  });

  it("o pico medido é registado, em mV", () => {
    const t = tracadoEmPapel(comEspiga(2500), 300, { alturaMm: 40 })!;
    expect(t.picoMv).toBeCloseTo(2.5, 6);
  });
});

describe("quando o traçado não cabe, o papel sabe", () => {
  it("**diz que cortou** — em vez de desenhar por cima da faixa de cima", () => {
    /*
     * Medido no review: 2,5 mV numa faixa de 36 mm saía a 7 mm **acima** do
     * topo, desenhado por cima do cabeçalho — e com três faixas invadia a de
     * cima, inventando onda numa faixa que não era a dela.
     */
    const dente: Array<number | null> = Array.from({ length: 300 }, (_, i) =>
      i % 3 === 0 ? 2500 : 0
    );
    const t = tracadoEmPapel(dente, 300, { alturaMm: 36 })!;
    expect(t.cortado).toBe(true);
    expect(t.picoMv).toBeCloseTo(2.5, 6);
  });

  it("**e fica preso dentro da faixa**", () => {
    const a: Array<number | null> = Array.from({ length: 300 }, (_, i) =>
      i % 2 === 0 ? 3000 : -3000
    );
    const t = tracadoEmPapel(a, 300, { alturaMm: 36 })!;
    for (const f of t.faixas) {
      for (const c of f.colunas) {
        expect(c.yMin!).toBeGreaterThanOrEqual(0);
        expect(c.yMax!).toBeLessThanOrEqual(36);
      }
    }
  });

  it("um traçado que cabe não diz que cortou", () => {
    const t = tracadoEmPapel(onda(10, 300, 800), 300, { alturaMm: 36 })!;
    expect(t.cortado).toBe(false);
  });
});

describe("sem escala não se imprime", () => {
  it("**sem frequência não há traçado** — um ECG sem escala de tempo não é um ECG", () => {
    expect(tracadoEmPapel(onda(10, 300), null)).toBeNull();
    expect(tracadoEmPapel(onda(10, 300), 0)).toBeNull();
    expect(tracadoEmPapel(onda(10, 300), -300)).toBeNull();
    expect(tracadoEmPapel(onda(10, 300), NaN)).toBeNull();
  });

  it("sem amostras também não", () => {
    expect(tracadoEmPapel([], 300)).toBeNull();
    expect(tracadoEmPapel(null, 300)).toBeNull();
    expect(tracadoEmPapel(undefined, 300)).toBeNull();
  });

  it("**uma amostra só não desenha nada** — e devolve `null`", () => {
    /*
     * Antes devolvia um objecto com faixas e **zero** colunas desenháveis, e o
     * PDF, que só testava `!tracado`, imprimia grelha e escala sem traçado e
     * sem aviso nenhum. Uma folha com escala e sem onda lê-se como uma linha
     * reta, que é o que uma assistolia parece.
     */
    expect(tracadoEmPapel([1000], 300)).toBeNull();
  });

  it("**uma lista toda de buracos também**", () => {
    expect(tracadoEmPapel([null, null, null, null], 300)).toBeNull();
  });

  it("mas duas amostras boas já são um traçado", () => {
    expect(tracadoEmPapel([1000, -1000], 300, { pontosPorMm: 100 })).not.toBeNull();
  });

  it("**a frase da escala vai no papel**, com a frequência real", () => {
    expect(frasePadraoDaEscala(300)).toBe("Scale: 25mm/s, 10mm/mV · sampled at 300 Hz");
    expect(frasePadraoDaEscala(500)).toContain("500 Hz");
  });

  it("sem frequência, a frase não inventa uma", () => {
    expect(frasePadraoDaEscala(null)).toContain("?");
    expect(frasePadraoDaEscala(null)).not.toMatch(/[0-9]+ Hz/);
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
  const amostras: Array<number | null> = Array.from({ length: 9000 }, (_, i) =>
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

  it("**o traçado inteiro fica dentro da altura da faixa, e não foi cortado**", () => {
    const t = tracadoEmPapel(amostras, 300, { alturaMm: 40 })!;
    expect(t.cortado).toBe(false);
    expect(t.picoMv).toBeCloseTo(0.4, 2);
    for (const f of t.faixas) {
      for (const c of f.colunas) {
        expect(c.yMin!).toBeGreaterThanOrEqual(0);
        expect(c.yMax!).toBeLessThanOrEqual(40);
      }
    }
  });
});
