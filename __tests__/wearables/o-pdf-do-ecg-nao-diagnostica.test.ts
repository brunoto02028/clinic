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
    const dente = Array.from({ length: 9000 }, (_, i) => (i % 150 === 0 ? 2500 : 0));
    const t = textoDoPdf(construirPdfDoEcg({ ...base, signal: dente }));
    expect(t).toMatch(/clipped/i);
    expect(t).toMatch(/2\.50 mV/);
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
