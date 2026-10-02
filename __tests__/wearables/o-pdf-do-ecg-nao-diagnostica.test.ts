/**
 * @jest-environment node
 *
 * O PDF do ECG relata, e não diagnostica (099 T-9).
 *
 * É o papel que o paciente leva a um médico. Sai da clínica, vai para a mão de
 * alguém que decide, e por isso o que ele **não** diz importa tanto quanto o
 * que diz:
 *
 * - a conclusão é **do aparelho**, e a folha diz isso em cada sítio onde ela
 *   aparece;
 * - não há leitura do traçado e não há sugestão de conduta — ler um ECG é ato
 *   médico, e um produto de reabilitação que o fizesse seria outro produto,
 *   regulado. A palavra "diagnóstico" **aparece**, e tem de aparecer: na frase
 *   que diz que o papel não é um. O que se proíbe é afirmá-lo, não nomeá-lo;
 * - a escala está impressa, porque é ela que torna o papel mensurável com régua.
 *
 * Um PDF não se lê num teste. O que se mede aqui é o **texto** que ele carrega e
 * o facto de ele existir — e o texto é a parte que pode passar a afirmar coisas
 * sem ninguém dar conta.
 */

import { alturaQueOSinalPede } from "@/lib/ecg-tracado";
import { construirPdfDoEcg, DadosDoEcgParaPapel } from "../../lib/ecg-pdf";

/** Extrai o texto legível de dentro do PDF, sem o descomprimir. */
const textoDoPdf = (buf: ArrayBuffer) =>
  Buffer.from(buf).toString("latin1");

const base: DadosDoEcgParaPapel = {
  nome: "Bruno To",
  dataDeNascimento: new Date("1978-08-22T00:00:00Z"),
  recordedAt: new Date("2026-10-01T22:54:15.000Z"),
  fuso: "Europe/London",
  heartRate: 63,
  conclusao: "normal",
  signal: Array.from({ length: 9000 }, (_, i) =>
    Math.round(400 * Math.sin((i / 300) * 2 * Math.PI))
  ),
  samplingHz: 300,
  wearPosition: 1,
  clinica: "BPR Clinic",
};

describe("o papel sai e é um PDF", () => {
  it("produz um PDF com conteúdo", () => {
    const buf = construirPdfDoEcg(base);
    expect(buf.byteLength).toBeGreaterThan(2000);
    expect(textoDoPdf(buf).slice(0, 5)).toBe("%PDF-");
  });

  it("**desenha mesmo as três faixas** — não é uma folha vazia", () => {
    /*
     * 9.000 amostras a 300 Hz são 30 s = três faixas de dez. Um PDF com o
     * traçado é muito maior do que um sem ele; é a diferença entre desenhar
     * milhares de segmentos e desenhar nenhum.
     */
    const com = construirPdfDoEcg(base).byteLength;
    const sem = construirPdfDoEcg({ ...base, signal: null }).byteLength;
    expect(com).toBeGreaterThan(sem * 2);
  });
});

describe("o que o papel diz", () => {
  const texto = textoDoPdf(construirPdfDoEcg(base));

  it("diz de quem é", () => {
    expect(texto).toContain("Bruno To");
  });

  it("**imprime a escala**, que é o que torna o papel mensurável", () => {
    expect(texto).toContain("25mm/s");
    expect(texto).toContain("10mm/mV");
    expect(texto).toContain("300 Hz");
  });

  it("diz onde no corpo foi medido", () => {
    expect(texto).toContain("Left wrist");
  });

  it("**diz que a conclusão é do relógio**", () => {
    expect(texto).toMatch(/watch concluded/i);
    expect(texto).toMatch(/Sinus rhythm/i);
    expect(texto).toMatch(/the watch found no signs/i);
  });
});

describe("o que o papel recusa dizer", () => {
  const comTodas = (d: Partial<DadosDoEcgParaPapel>) =>
    textoDoPdf(construirPdfDoEcg({ ...base, ...d }));

  it("**a palavra 'diagnóstico' só aparece a ser negada**", () => {
    /*
     * A primeira versão deste teste proibia a palavra por completo — e
     * contradizia o teste seguinte, que exige a frase *"não é um
     * diagnóstico"*. A regra não é a palavra: é **nunca afirmar um**. A negação
     * é obrigatória, e é ela que impede o papel de ser lido como mais do que é.
     */
    for (const conclusao of ["normal", "fibrilacao", "inconclusivo"]) {
      for (const idioma of ["en", "pt"] as const) {
        const t = comTodas({ conclusao, idioma }).toLowerCase();
        const ocorrencias = [...t.matchAll(/diagn[oó]s\w*/g)];
        for (const o of ocorrencias) {
          const antes = t.slice(Math.max(0, o.index! - 20), o.index!);
          expect(antes).toMatch(/not a |não é um /);
        }
      }
    }
  });

  it("e diz, por extenso, que **não é um diagnóstico e não foi lido por um clínico**", () => {
    // A negação é permitida e é o ponto: é a frase que impede o papel de ser
    // lido como mais do que é.
    expect(comTodas({ idioma: "en" })).toMatch(/not a diagnosis/i);
    expect(comTodas({ idioma: "pt" })).toMatch(/não é um diagnóstico/i);
  });

  it("**nunca sugere conduta**", () => {
    for (const conclusao of ["normal", "fibrilacao", "inconclusivo"]) {
      const t = comTodas({ conclusao }).toLowerCase();
      for (const proibida of ["you should", "we recommend", "treatment", "medication"]) {
        expect(t).not.toContain(proibida);
      }
    }
  });

  it("**não chama 'normal' ao ritmo sem dizer de quem é a palavra**", () => {
    /*
     * "Sinus rhythm" é a palavra do aparelho e vai acompanhada de *"the watch
     * found no signs"*. O que não pode aparecer é um "Normal" solto, que se
     * leria como afirmação nossa sobre o coração de alguém.
     */
    const t = comTodas({ conclusao: "normal" });
    expect(t).not.toMatch(/Normal rhythm/);
    expect(t).not.toMatch(/Ritmo normal/);
  });

  it("a fibrilhação é **nomeada**, e não diluída", () => {
    expect(comTodas({ conclusao: "fibrilacao" })).toMatch(/signs of atrial fibrillation/i);
    expect(comTodas({ conclusao: "fibrilacao", idioma: "pt" })).toMatch(/fibrilh?ação atrial/i);
  });
});

describe("sem traçado, o papel ainda vale", () => {
  it("**diz que o traçado não foi obtido**, em vez de desenhar uma linha reta", () => {
    /*
     * Uma linha reta no meio de um papel de ECG lê-se como um coração parado.
     * Um buraco explicado é infinitamente melhor do que um achado inventado.
     */
    const t = textoDoPdf(construirPdfDoEcg({ ...base, signal: null }));
    expect(t).toMatch(/has not been retrieved/i);
    expect(t).toContain("Bruno To");
    expect(t).toMatch(/Sinus rhythm/i);
  });

  it("e sem frequência também não desenha", () => {
    const t = textoDoPdf(construirPdfDoEcg({ ...base, samplingHz: null }));
    expect(t).toMatch(/has not been retrieved/i);
  });
});

describe("quando o traçado é reduzido, o papel diz", () => {
  it("**diz que cada coluna é o mínimo e o máximo**, e não uma média", () => {
    /*
     * A frase mudou porque o desenho mudou, e a antiga passou a ser falsa.
     *
     * Com a média, uma espiga de 1,5 mV que durava uma amostra saía impressa a
     * 0,5 mV — um terço da altura real — e o papel declarava `10mm/mV` como se
     * nada fosse. Quem mede altura de R ou elevação de ST com uma régua lia um
     * valor atenuado. Agora cada coluna desenha os dois extremos do punhado, e
     * é isso que o papel afirma.
     */
    const t = textoDoPdf(construirPdfDoEcg(base));
    expect(t).toMatch(/min and max of [0-9]+ samples/i);
    expect(t).not.toMatch(/mean of/i);
  });

  it("**e avisa quando o traçado foi cortado**, com o pico que mediu", () => {
    /*
     * 2,5 mV numa faixa de 36 mm não cabem. Antes o excesso era desenhado por
     * cima do cabeçalho e da faixa de cima; depois passou a ser preso ao tecto,
     * o que dá ondas R de topo plano — à régua lia-se 1,8 mV num sinal de 2,5.
     * Em silêncio, nos dois casos.
     */
    /*
     * **5 mV, e não 2,5.** A faixa passou a crescer com o sinal (ver
     * `alturaQueOSinalPede`), porque o ECG real do Bruno chega a 3,38 mV e numa
     * faixa de 36 mm as ondas R batiam no tecto — o papel avisava do corte e
     * quem media o R à régua lia metade.
     *
     * Acima do tecto de 80 mm (±4 mV) o corte volta a ser inevitável, e aí o
     * aviso tem de continuar lá.
     */
    const dente = Array.from({ length: 9000 }, (_, i) => (i % 150 === 0 ? 5000 : 0));
    const t = textoDoPdf(construirPdfDoEcg({ ...base, signal: dente }));
    expect(t).toMatch(/clipped/i);
    expect(t).toMatch(/5\.00 mV/);
  });

  it("**um sinal constante não sai como linha reta** — diz que não foi obtido", () => {
    /*
     * O achado do QA de 02/10/2026, medido por dentro do PDF: zeros passam o
     * filtro da ingestão (`0` é número), e saíam como três faixas de papel
     * milimetrado com uma linha perfeitamente reta, debaixo de "Sinus rhythm",
     * com a escala declarada e nenhuma ressalva. Em papel de ECG lê-se como
     * assistolia.
     */
    const t = textoDoPdf(construirPdfDoEcg({ ...base, signal: new Array(9000).fill(0) }));
    expect(t).toMatch(/has not been retrieved/i);
    expect(t).not.toMatch(/min and max of/i);
  });
});

describe("o papel parece uma tira de verdade", () => {
  /**
   * > *"O ECG em papel não ficou bom, nem perto do real"* — Bruno, 02/10/2026
   *
   * A geometria estava certa — o QA mediu 25,000 mm por segundo e 10,000 mm por
   * milivolt dentro do PDF — e o papel na mesma não parecia um ECG. Duas razões,
   * as duas visíveis só a olhar:
   *
   * 1. **o traço era um borrão.** Cada coluna desenhava a sua barra vertical e
   *    uma ligação à anterior, cada uma com 0,25 mm e ponta redonda. As colunas
   *    estão a 0,25 mm de distância: as pontas sobrepunham-se e a linha de base
   *    saía gorda. Agora é um caminho só por troço, a 0,18 mm, com ponta reta;
   * 2. **faltava o pulso de calibração** — o degrau de 1 mV no início da tira.
   *    Não é decoração: é o que mostra a quem lê que o ganho declarado no rodapé
   *    é o ganho que foi usado. Uma régua posta nele tem de dar 10 mm.
   */
  const comOnda = () => {
    /* Um P-QRS-T simples, para haver forma onde medir. */
    const HZ = 300;
    const RR = Math.round((HZ * 60) / 72);
    const g = (t: number, c: number, w: number, a: number) =>
      a * Math.exp(-((t - c) ** 2) / (2 * w * w));
    return Array.from({ length: HZ * 30 }, (_, i) => {
      const t = i % RR;
      return Math.round(
        g(t, 0.17 * RR, 0.035 * RR, 90) +
          g(t, 0.33 * RR, 0.01 * RR, 780) +
          g(t, 0.58 * RR, 0.055 * RR, 210)
      );
    });
  };

  /** Os números crus do content stream, que o jsPDF não comprime. */
  const fluxo = (pdf: ArrayBuffer) => Buffer.from(pdf).toString("latin1");

  /**
   * Os caminhos do content stream, em **milímetros**.
   *
   * O jsPDF escreve em pontos (72 por polegada) com o y para cima. Medir em mm
   * é medir o que uma régua mede no papel — e é a única forma honesta de dizer
   * que o pulso tem 10 mm, em vez de fixar a grafia de um número.
   */
  const PT_POR_MM = 72 / 25.4;
  const caminhos = (pdf: ArrayBuffer) => {
    const t = Buffer.from(pdf).toString("latin1");
    const saida: Array<Array<{ x: number; y: number }>> = [];
    let atual: Array<{ x: number; y: number }> = [];
    for (const m of t.matchAll(/([\d.]+) ([\d.]+) (m|l)\b|\bS\b/g)) {
      if (m[0] === "S") {
        if (atual.length) saida.push(atual);
        atual = [];
        continue;
      }
      if (m[3] === "m" && atual.length) {
        saida.push(atual);
        atual = [];
      }
      atual.push({ x: Number(m[1]) / PT_POR_MM, y: Number(m[2]) / PT_POR_MM });
    }
    if (atual.length) saida.push(atual);
    return saida;
  };

  it("**o pulso de calibração mede 1 mV de altura** — 10 mm, à régua", () => {
    const todos = caminhos(construirPdfDoEcg({ ...base, signal: comOnda() }));
    /* O pulso tem seis pontos e é o primeiro caminho de cada faixa. */
    const pulsos = todos.filter((c) => c.length === 6);
    expect(pulsos.length).toBeGreaterThan(0);

    const p = pulsos[0];
    const altura = Math.max(...p.map((v) => v.y)) - Math.min(...p.map((v) => v.y));
    expect(altura).toBeCloseTo(10, 2);
  });

  it("**e aparece uma vez por faixa**", () => {
    // Quem corta a folha a meio continua a poder verificar o ganho.
    const pulsos = caminhos(construirPdfDoEcg({ ...base, signal: comOnda() })).filter(
      (c) => c.length === 6
    );
    expect(pulsos).toHaveLength(3);
  });

  it("**e o planalto tem 5 mm** — 200 ms, que é a convenção", () => {
    /*
     * Estava a 3 mm enquanto o comentário do próprio código prometia 5, e dizia
     * que *"se não der, o papel inteiro é suspeito"*. Medido pelo QA
     * comparativo nos operadores do PDF.
     */
    const p = caminhos(construirPdfDoEcg({ ...base, signal: comOnda() })).find(
      (c) => c.length === 6
    )!;
    const ys = p.map((v) => v.y);
    /* No PDF o `y` cresce para **cima**: o topo do degrau é o máximo. */
    const topo = Math.max(...ys);
    /* As duas arestas verticais: o planalto é a distância entre elas. */
    const noTopo = p.filter((v) => Math.abs(v.y - topo) < 0.01).map((v) => v.x);
    expect(Math.max(...noTopo) - Math.min(...noTopo)).toBeCloseTo(5, 2);

    const largura = Math.max(...p.map((v) => v.x)) - Math.min(...p.map((v) => v.x));
    expect(largura).toBeCloseTo(9, 2);
  });

  it("**o traço é fino** — 0,18 mm, não 0,25", () => {
    /*
     * 0,18 mm = 0,51 pt. A 0,25 mm com ponta redonda, e com as colunas a
     * 0,25 mm de distância, a tinta dobrava e a linha de base virava um borrão.
     */
    const t = fluxo(construirPdfDoEcg({ ...base, signal: comOnda() }));
    expect(t).toMatch(/0\.51\d* w/);
    expect(t).not.toMatch(/0\.70\d* w/);
  });

  it("**sem traçado, não há pulso de calibração**", () => {
    // Um degrau de ganho num papel sem traço é uma escala para coisa nenhuma.
    const pulsos = caminhos(construirPdfDoEcg({ ...base, signal: null })).filter(
      (c) => c.length === 6
    );
    expect(pulsos).toHaveLength(0);
  });
});

describe("a faixa cresce com o sinal", () => {
  /**
   * > O ECG real do Bruno chega a **3,38 mV**.
   *
   * Numa faixa de 36 mm — ±1,8 mV a 10 mm/mV — as ondas R batiam no tecto e
   * ficavam de topo plano. O papel **dizia** que tinha cortado, o que é honesto,
   * e não substituía a medida: quem punha a régua na altura do R lia 1,8 mV num
   * sinal de 3,38.
   *
   * A escala **não muda** — continua 10 mm/mV. O que muda é o espaço.
   */
  const comPico = (uv: number) =>
    Array.from({ length: 9000 }, (_, i) => (i % 150 === 0 ? uv : 0));

  it("**um sinal pequeno mantém a faixa compacta**", () => {
    // O caso comum continua a caber numa página.
    expect(alturaQueOSinalPede(comPico(800))).toBe(40);
  });

  it("**e o sinal do Bruno deixa de ser cortado**", () => {
    const altura = alturaQueOSinalPede(comPico(3380));
    /* 3,38 mV são 33,8 mm de um lado: a faixa precisa de mais do que o dobro. */
    expect(altura).toBeGreaterThanOrEqual(2 * 33.8);
    const t = textoDoPdf(construirPdfDoEcg({ ...base, signal: comPico(3380) }));
    expect(t).not.toMatch(/clipped/i);
  });

  it("**mas não cresce para além do que cabe numa A4**", () => {
    // 80 mm são ±4 mV e ainda deixam duas faixas na folha deitada.
    expect(alturaQueOSinalPede(comPico(9000))).toBe(80);
  });

  it("e cresce em passos de 5 mm, para ficar alinhada com a grelha grande", () => {
    for (const uv of [1500, 2200, 3380, 3900]) {
      expect(alturaQueOSinalPede(comPico(uv)) % 5).toBe(0);
    }
  });

  it("**sem sinal, a altura é a compacta** — e não zero", () => {
    expect(alturaQueOSinalPede(null)).toBe(40);
    expect(alturaQueOSinalPede([])).toBe(40);
    expect(alturaQueOSinalPede([null, null])).toBe(40);
  });
});
