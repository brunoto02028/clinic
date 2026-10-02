/**
 * @jest-environment node
 *
 * O gráfico do relatório (118 T-8).
 *
 * ## O pedido
 *
 * > *"só acho que no layout do relatório falta informação, gráfico, quero no
 * > mesmo estilo que o Sonar faz, o próprio Withings faz…"* — Bruno
 *
 * O papel mostrava **um número por métrica** e o banco tem a série diária desde
 * sempre. Um número sozinho não responde à pergunta que leva alguém ao médico:
 * *o que mudou*.
 *
 * ## O que este ficheiro guarda, e porquê
 *
 * **Que a linha não atravessa um buraco.** Ligar segunda a sábado por cima de
 * quatro dias sem dado conta uma história que não aconteceu — e num papel que
 * alguém põe à frente de um clínico, uma tendência inventada é pior do que não
 * desenhar nada.
 *
 * É a mesma regra do traçado do ECG, onde apagar uma amostra encurtava a
 * gravação. Ali custou um segundo em trinta; aqui custa a conclusão.
 *
 * E **que o x é o dia**, não a posição na lista. Três medidas num mês desenhadas
 * igualmente espaçadas mentem sobre quando as coisas aconteceram.
 */

import { graficoDeLinha, graficoDeLinhas, barraDasFases } from "../../lib/grafico-de-linha";

/** Dias seguidos, a partir de 01/10/2026. */
const dias = (valores: Array<number | null>) =>
  valores.map((valor, i) => ({
    dia: `2026-10-${String(i + 1).padStart(2, "0")}`,
    valor,
  }));

/** Quantos `<path>` — ou seja, quantos troços contínuos. */
const troços = (svg: string) => (svg.match(/<path /g) ?? []).length;

/**
 * Todas as coordenadas desenhadas — dos caminhos **e** dos pontos soltos.
 *
 * Um troço de um dia só não sai num `<path>`: sai num `<circle>`, porque uma
 * linha precisa de dois pontos. Olhar só para os caminhos perderia justamente o
 * dia isolado, que é o caso que o buraco cria.
 */
const pontos = (svg: string) => [
  ...Array.from(svg.matchAll(/[ML]([\d.]+) ([\d.]+)/g)).map((m) => ({
    x: Number(m[1]),
    y: Number(m[2]),
  })),
  ...Array.from(svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)"/g)).map((m) => ({
    x: Number(m[1]),
    y: Number(m[2]),
  })),
];

describe("a linha não atravessa um dia sem dado", () => {
  it("**quatro dias seguidos são um traço**", () => {
    const g = graficoDeLinha(dias([50, 52, 54, 56]))!;
    expect(troços(g.svg)).toBe(1);
    expect(g.segmentos).toBe(1);
    expect(g.dias).toBe(4);
  });

  it("**um buraco no meio parte a linha em dois**", () => {
    /*
     * Com uma linha contínua, quem lê vê uma descida suave de 50 a 56 ao longo
     * da semana. O que aconteceu foi: mediu segunda e terça, não mediu três
     * dias, voltou a medir. São coisas diferentes.
     */
    const g = graficoDeLinha(dias([50, 52, null, null, null, 54, 56]))!;
    expect(troços(g.svg)).toBe(2);
    expect(g.segmentos).toBe(2);
    expect(g.dias).toBe(4);
  });

  it("e um buraco de **um dia só** também parte", () => {
    // Não há tamanho de buraco que se possa atravessar sem inventar.
    const g = graficoDeLinha(dias([50, null, 54]))!;
    expect(g.segmentos).toBe(2);
  });

  it("**os dias medidos ficam onde aconteceram**", () => {
    /*
     * O `x` é o dia, não o índice de quem tem dado. Três medidas num mês
     * desenhadas igualmente espaçadas mentem sobre quando as coisas foram.
     */
    const g = graficoDeLinha([
      { dia: "2026-10-01", valor: 50 },
      { dia: "2026-10-02", valor: 52 },
      { dia: "2026-10-31", valor: 60 },
    ])!;
    const xs = pontos(g.svg).map((p) => p.x);
    /* 30 dias de vão: o segundo ponto cai perto do início, não a meio. */
    expect(xs[1]).toBeLessThan(20);
    /*
     * E o de 31/10 está no fim — sozinho, porque 29 dias o separam do anterior:
     * sai como ponto e não como linha, que é o que ele é.
     */
    expect(Math.max(...xs)).toBeCloseTo(260, 0);
    expect(g.segmentos).toBe(2);
    expect(g.svg).toContain("<circle");
  });
});

describe("quando não há o que desenhar, não se desenha", () => {
  it("**um ponto só não é uma linha**", () => {
    /*
     * Um pontinho no meio de um gráfico vazio sugere uma série que não existe.
     * O número grande acima já diz o que há.
     */
    expect(graficoDeLinha(dias([50]))).toBeNull();
  });

  it("nenhum dado, nenhuma caixa", () => {
    expect(graficoDeLinha(dias([null, null, null]))).toBeNull();
    expect(graficoDeLinha([])).toBeNull();
    expect(graficoDeLinha(null)).toBeNull();
    expect(graficoDeLinha(undefined)).toBeNull();
  });

  it("**um dia que não se lê não produz `NaN` no caminho**", () => {
    /*
     * Apanhado a olhar para o papel, não pelos testes: as séries deles tinham
     * todas datas válidas. Com `2026-09-32`, o `d` saía `M NaN 22.2`, o
     * navegador recusava o atributo inteiro, e a linha **não aparecia** — com um
     * erro na consola que ninguém vê num PDF guardado. Entre o mínimo e o máximo
     * escritos ficava um espaço vazio, que se lê como "não houve variação".
     */
    const serie = [
      { dia: "2026-09-31", valor: 50 },
      { dia: "2026-09-32", valor: 52 },
      { dia: "nao e data", valor: 54 },
    ];
    expect(graficoDeLinha(serie)).toBeNull();

    const misto = [
      { dia: "2026-10-01", valor: 50 },
      { dia: "2026-13-45", valor: 999 },
      { dia: "2026-10-02", valor: 52 },
    ];
    const g = graficoDeLinha(misto)!;
    expect(g.svg).not.toContain("NaN");
    expect(g.dias).toBe(2);
    expect(g.maximo).toBe(52);
  });

  it("valores que não são número não contam", () => {
    const serie = [
      { dia: "2026-10-01", valor: NaN },
      { dia: "2026-10-02", valor: Infinity },
      { dia: "2026-10-03", valor: 50 },
    ] as any;
    expect(graficoDeLinha(serie)).toBeNull();
  });
});

describe("a escala diz a verdade sobre a variação", () => {
  it("**o mínimo e o máximo saem escritos**", () => {
    // Um eixo sem limites sugere uma variação que não existe.
    const g = graficoDeLinha(dias([48, 55, 51]))!;
    expect(g.minimo).toBe(48);
    expect(g.maximo).toBe(55);
  });

  it("**o maior valor fica em cima** — e o y cresce para baixo no SVG", () => {
    const g = graficoDeLinha(dias([50, 60]))!;
    const [a, b] = pontos(g.svg);
    expect(b.y).toBeLessThan(a.y);
  });

  it("**uma série constante desenha-se a meio**, não no fundo", () => {
    /*
     * Amplitude zero dividiria por zero. No fundo leria como "esteve no
     * mínimo"; a meio é o que foi — não variou.
     */
    const g = graficoDeLinha(dias([60, 60, 60]), { altura: 44 })!;
    for (const p of pontos(g.svg)) expect(p.y).toBeCloseTo(22, 1);
    expect(g.minimo).toBe(60);
    expect(g.maximo).toBe(60);
  });

  it("**a linha cabe dentro da caixa**", () => {
    const g = graficoDeLinha(dias([10, 90, 50, 70]), { largura: 260, altura: 44 })!;
    for (const p of pontos(g.svg)) {
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(44);
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(260);
    }
  });
});

describe("o que o gráfico recusa fazer", () => {
  it("**nenhuma faixa de referência, nenhuma cor que julgue**", () => {
    /*
     * Uma banda verde de "normal" é uma afirmação clínica desenhada. Saiu na
     * 099 T-2 e não volta por um gráfico novo.
     */
    const g = graficoDeLinha(dias([50, 90, 120, 60]))!;
    expect(g.svg).not.toMatch(/<rect/);
    const cores = new Set(Array.from(g.svg.matchAll(/stroke="([^"]+)"/g)).map((m) => m[1]));
    expect(cores.size).toBe(1);
    expect(g.svg).not.toMatch(/red|green|#ef4444|#22c55e/i);
  });

  it("**nada de rede e nada de script**", () => {
    // Um documento clínico não pede nada a terceiros enquanto alguém o lê, e um
    // gráfico feito por JavaScript não sai no PDF que a pessoa guarda.
    const g = graficoDeLinha(dias([50, 52, 54]))!;
    expect(g.svg).not.toMatch(/<script|https?:|\/\/|url\(/i);
  });

  it("e não se anuncia a quem usa leitor de ecrã como se fosse texto", () => {
    // O número e a nota ao lado dizem tudo o que a linha diz.
    expect(graficoDeLinha(dias([50, 52]))!.svg).toContain('aria-hidden="true"');
  });
});

describe("as fases da noite", () => {
  const fases = (p: number, l: number, r: number, a: number) => [
    { rotulo: "Profundo", minutos: p, cor: "#3A4150" },
    { rotulo: "Leve", minutos: l, cor: "#7E98A8" },
    { rotulo: "REM", minutos: r, cor: "#4F7361" },
    { rotulo: "Acordado", minutos: a, cor: "#CDC7BE" },
  ];

  it("**as larguras são proporcionais aos minutos**", () => {
    /*
     * Sete horas com uma de sono profundo e sete com três são noites
     * diferentes, e o total de minutos não as distingue.
     */
    const svg = barraDasFases(fases(60, 180, 90, 30), { largura: 360 })!;
    const larguras = Array.from(svg.matchAll(/width="([\d.]+)"/g)).map((m) => Number(m[1]));
    /* 60/360 do total de 360 min = 60 px numa barra de 360. */
    expect(larguras[0]).toBeCloseTo(60, 0);
    expect(larguras[1]).toBeCloseTo(180, 0);
    expect(larguras.reduce((s, w) => s + w, 0)).toBeCloseTo(360, 0);
  });

  it("**uma fase com zero minutos não ocupa espaço**", () => {
    const svg = barraDasFases(fases(60, 180, 0, 0), { largura: 240 })!;
    expect((svg.match(/<rect/g) ?? []).length).toBe(2);
  });

  it("**sem fase nenhuma, não há barra** — e não uma barra vazia", () => {
    // Uma barra vazia leria como "não dormiu".
    expect(barraDasFases(fases(0, 0, 0, 0))).toBeNull();
    expect(barraDasFases([])).toBeNull();
  });

  it("cada pedaço diz o que é, para quem passa o rato", () => {
    const svg = barraDasFases(fases(60, 180, 90, 30))!;
    expect(svg).toContain("<title>Profundo</title>");
  });
});

describe("duas linhas na mesma caixa — a pressão", () => {
  /**
   * > *"faz a pressão tb"* — Bruno, 02/10/2026
   *
   * A sistólica e a diastólica **lêem-se juntas**, e o afastamento entre elas é
   * informação. Em caixas separadas, cada uma com a sua escala, a diastólica
   * subiria tanto como a sistólica e as duas pareceriam iguais — o gráfico
   * mostraria duas linhas parecidas e esconderia a única coisa que elas dizem em
   * conjunto.
   */
  const sis = dias([140, 138, 136, 134]);
  const dia_ = dias([92, 91, 90, 88]);

  it("**a escala é das duas juntas**, não uma por linha", () => {
    const g = graficoDeLinhas([{ pontos: sis }, { pontos: dia_ }])!;
    expect(g.minimo).toBe(88);
    expect(g.maximo).toBe(140);
  });

  it("**e por isso a diastólica fica mesmo por baixo**", () => {
    /*
     * Com escalas separadas, 88 e 140 desenhavam-se ambos no fundo da sua caixa
     * e a distância entre as duas linhas desaparecia.
     */
    const g = graficoDeLinhas([{ pontos: sis, cor: "#20242D" }, { pontos: dia_, cor: "#8FA89A" }])!;
    const ys = pontos(g.svg).map((p) => p.y);
    const metade = ys.length / 2;
    const ySistolica = Math.max(...ys.slice(0, metade));
    const yDiastolica = Math.min(...ys.slice(metade));
    /* `y` cresce para baixo: a diastólica, menor, tem `y` maior. */
    expect(yDiastolica).toBeGreaterThan(ySistolica);
  });

  it("**cada linha tem a sua cor**, e elas diferem em claridade", () => {
    /*
     * Duas cores da mesma luminosidade são a mesma linha para quem não as
     * separa — e numa impressão a preto e branco são a mesma linha para toda a
     * gente.
     */
    const g = graficoDeLinhas([{ pontos: sis, cor: "#20242D" }, { pontos: dia_, cor: "#8FA89A" }])!;
    const cores = Array.from(g.svg.matchAll(/stroke="([^"]+)"/g)).map((m) => m[1]);
    expect(new Set(cores).size).toBe(2);

    const clareza = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114;
    };
    expect(Math.abs(clareza("#20242D") - clareza("#8FA89A"))).toBeGreaterThan(60);
  });

  it("**e cada uma parte nos seus próprios buracos**", () => {
    // Um dia em que mediu a sistólica e não a diastólica não une nenhuma das duas.
    const g = graficoDeLinhas([
      { pontos: dias([140, 138, null, 134, 132]) },
      { pontos: dias([92, 91, 90, 89, 88]) },
    ])!;
    /* Dois troços na primeira, um na segunda. */
    expect(g.segmentos).toBe(3);
  });

  it("uma série vazia ao lado de outra cheia não estraga a cheia", () => {
    const g = graficoDeLinhas([{ pontos: sis }, { pontos: [] }])!;
    expect(g.minimo).toBe(134);
    expect(g.maximo).toBe(140);
  });

  it("**sem nenhuma das duas, não há caixa**", () => {
    expect(graficoDeLinhas([{ pontos: [] }, { pontos: [] }])).toBeNull();
    expect(graficoDeLinhas([])).toBeNull();
  });

  it("e o gráfico de uma linha continua a ser o mesmo", () => {
    // `graficoDeLinha` passou a delegar: o comportamento antigo não muda.
    const a = graficoDeLinha(sis);
    const b = graficoDeLinhas([{ pontos: sis }]);
    expect(a!.svg).toBe(b!.svg);
  });
});
