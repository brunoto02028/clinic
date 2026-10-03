/**
 * @jest-environment node
 *
 * Cada número do papel diz **como foi feito** (120 T-6).
 *
 * ## O achado
 *
 * Três métricas saem lado a lado, na mesma coluna, com a mesma aparência — e são
 * três contas diferentes:
 *
 * - o **SpO₂** é a média das medições do dia, e depois a média dos dias: média
 *   de médias não ponderada, em que um dia com uma medição pesa igual a um dia
 *   com oito;
 * - a **FC de repouso**, quando vem das medições, é o `Math.min` do dia, porque
 *   a média de um dia de frequências não é uma frequência de repouso;
 * - a **VFC** é a média de duas janelas da noite, e o tamanho das janelas não
 *   está documentado pela Withings.
 *
 * Nada disto inventa dado. O que faltava era **dizê-lo** — a mesma regra pela
 * qual o papel do ECG imprime *"25 mm/s, 10 mm/mV"*: um número sem a sua escala
 * convida a medir com a régua errada.
 *
 * ## O que este ficheiro protege
 *
 * Que a frase existe, que está na língua do papel, que **não julga**, e que uma
 * métrica nova não entra muda.
 */

import {
  COMO_FOI_CALCULADO,
  comoFoiCalculado,
  ONDE_MORA,
} from "@/lib/onde-mora-a-metrica";

/**
 * O papel inteiro, com a forma que o render lê.
 *
 * Vive na raiz do ficheiro porque **dois** blocos o usam: o que mede as frases
 * e o que conta as métricas do HTML. Estava dentro de um `describe`, e a guarda
 * nova não o alcançava.
 *
 * A dor e o humor têm valor de propósito: sem eles o `linhaDeSinal` devolve `""`
 * e as duas métricas que saíam mudas não entravam na contagem.
 */
const dados = {
  patient: {
    id: "p1",
    firstName: "Prova",
    lastName: "120",
    email: "p@example.test",
    dateOfBirth: new Date("1980-01-01T00:00:00Z"),
    createdAt: new Date("2026-01-01T00:00:00Z"),
    clinic: { name: "BPR Clinic", city: "Ipswich", country: "GB" },
  },
  screening: null,
  bodyAssessment: null,
  diagnosis: null,
  protocols: [],
  soapNotes: [],
  monitoring: {
    temSinais: true,
    sinais: {
      sono: { atual: 420, anterior: 410, variacao: 10, dias: 8 },
      fcRepouso: { atual: 55, anterior: 57, variacao: -2, dias: 8 },
      hrv: { atual: 14.5, anterior: 13, variacao: 1.5, dias: 6 },
      spo2: { atual: 97.3, anterior: 97, variacao: 0.3, dias: 5 },
      passos: { atual: 2210, anterior: 1900, variacao: 310, dias: 4 },
    },
    /*
     * **A forma inteira que o render lê**, e não só as chaves que esta
     * asserção usa. Um `pressao` em falta estourava num `mon.pressao.leituras`
     * sem guarda — e um teste que morre na fixture não mede o papel.
     */
    pressao: {
      leituras: 4,
      sistolica: { atual: 122.5, anterior: 120, variacao: 5, dias: 4 },
      diastolica: { atual: 78, anterior: 77, variacao: 1, dias: 4 },
    },
    comoSeSentiu: {
      dor: { atual: 5, anterior: 6, variacao: -1, dias: 4 },
      humor: { atual: 2.5, anterior: 2, variacao: 0.5, dias: 4 },
      registros: 4,
      ultimos: [],
    },
    exercicio: { registros: 0, diasComExercicio: 0 },
    consultas: [],
    ecg: [],
    series: {
      sistolica: [
        { dia: "2026-09-28", valor: 140 },
        { dia: "2026-09-30", valor: 110 },
      ],
      diastolica: [
        { dia: "2026-09-28", valor: 90 },
        { dia: "2026-09-30", valor: 70 },
      ],
    },
    periodo: { de: "2026-09-02", ate: "2026-10-02", dias: 30 },
  },
};



describe("a frase existe e fala a língua do papel", () => {
  it("**o SpO₂ diz que é média de médias**", () => {
    expect(comoFoiCalculado("spo2", "pt")).toBe(
      "média das medições do dia, e depois a média dos dias"
    );
    expect(comoFoiCalculado("spo2", "en")).toContain("averaged across days");
  });

  it("**a FC de repouso diz que pode ser o mínimo do dia**", () => {
    /*
     * É a métrica que muda de origem entre dias: noite registada → a média da
     * Withings; sem noite → o menor do dia. A frase tem de carregar as duas,
     * senão descreve metade dos dias.
     */
    for (const idioma of ["en", "pt"] as const) {
      const f = comoFoiCalculado("restingHr", idioma)!;
      expect(f).toBeTruthy();
      expect(f.toLowerCase()).toMatch(idioma === "pt" ? /menor/ : /lowest/);
      expect(f.toLowerCase()).toMatch(idioma === "pt" ? /noite/ : /night/);
    }
  });

  it("**a VFC diz que é a média de duas janelas, ou de uma**", () => {
    /*
     * A frase dizia sempre *"a média dos dois"*. O `mediaDeRmssd` usa **um só**
     * quando a Withings manda um só — estava no comentário do código e não na
     * frase que vai ao papel.
     */
    expect(comoFoiCalculado("hrv", "pt")).toContain("início e do fim da noite");
    expect(comoFoiCalculado("hrv", "pt")).toMatch(/único|um dos dois/);
    expect(comoFoiCalculado("hrv", "en")).toMatch(/whichever/);
  });

  it("e o inglês é o padrão quando ninguém diz a língua", () => {
    expect(comoFoiCalculado("spo2")).toBe(comoFoiCalculado("spo2", "en"));
  });

  it("**uma métrica sem frase devolve `null`**, e não uma frase inventada", () => {
    expect(comoFoiCalculado("naoExisteEstaMetrica")).toBeNull();
    expect(comoFoiCalculado("")).toBeNull();
  });
});

describe("as frases descrevem a conta, e não julgam", () => {
  /**
   * As palavras que transformam uma descrição num juízo.
   *
   * O papel não tem faixa de referência, nem semáforo, nem alerta — a comparação
   * é sempre da pessoa com ela mesma. Uma frase que diga *"normal"* ou *"bom"*
   * traz a faixa de referência pela porta dos fundos.
   */
  const JUIZOS = [
    "normal", "alto", "baixo", "bom", "ruim", "ideal", "saudável", "preocupante",
    "high", "low", "good", "bad", "healthy", "concerning", "abnormal",
  ];

  it("**nenhuma frase julga o valor**", () => {
    const acusadas: string[] = [];
    for (const [campo, frases] of Object.entries(COMO_FOI_CALCULADO)) {
      for (const idioma of ["en", "pt"] as const) {
        for (const palavra of JUIZOS) {
          if (new RegExp(`\\b${palavra}\\b`, "i").test(frases[idioma])) {
            acusadas.push(`${campo}.${idioma}: ${palavra}`);
          }
        }
      }
    }
    expect(acusadas).toEqual([]);
  });

  it("e nenhuma diz 'diagnóstico'", () => {
    for (const frases of Object.values(COMO_FOI_CALCULADO)) {
      expect(frases.pt.toLowerCase()).not.toContain("diagn");
      expect(frases.en.toLowerCase()).not.toContain("diagnos");
    }
  });

  it("as duas línguas estão preenchidas em todas", () => {
    for (const frases of Object.values(COMO_FOI_CALCULADO)) {
      expect(frases.en.trim().length).toBeGreaterThan(10);
      expect(frases.pt.trim().length).toBeGreaterThan(10);
      /* E não são a mesma cadeia: uma delas estaria sem traduzir. */
      expect(frases.en).not.toBe(frases.pt);
    }
  });
});

describe("e a frase sai no papel", () => {
  /*
   * Ter a frase no mapa não é tê-la impressa. A regra provada na função e
   * desfeita no JSX já aconteceu nesta base — 17 mutações verdes com a tela a
   * mentir —, por isso aqui mede-se o HTML.
   */
  const { renderPatientReportHTML } = require("@/lib/patient-report");

  it("**o papel imprime como cada número foi feito**, nas duas línguas", () => {
    for (const idioma of ["en", "pt"] as const) {
      const html = renderPatientReportHTML({ ...dados } as any, { idioma });
      for (const campo of ["spo2", "hrv", "restingHr", "sleepDuration", "steps"]) {
        const frase = comoFoiCalculado(campo, idioma)!;
        /* O HTML escapa as entidades, não os acentos — a frase entra como está. */
        expect(html).toContain(frase);
      }
    }
  });
});

describe("uma métrica nova não entra muda", () => {
  /**
   * **A guarda mede o HTML, e não uma lista escrita à mão** (achado do QA).
   *
   * A versão anterior tinha um `IMPRESSAS` com sete nomes, escritos aqui. O QA
   * mutou o código para imprimir uma oitava métrica sem frase e **842 testes
   * passaram** — porque a lista do teste e as chamadas do render são dois
   * sítios, e já tinham divergido: a **Dor** e o **Humor** saíam na mesma coluna
   * sem frase nenhuma, e o teste afirmava cobrir *"cada métrica impressa"*.
   *
   * Agora conta-se o que o papel desenha. Uma métrica nova sem frase quebra
   * isto sem ninguém ter de manter uma lista.
   */
  const { renderPatientReportHTML } = require("@/lib/patient-report");

  /**
   * Cada `<div class="metrica">` do papel, com o texto dele sem marcação.
   *
   * **Sem extrair o `<span class="nota">` por regex**: o `nota` contém um
   * `<span class="mudanca">` por dentro, e um grupo não-guloso parava no
   * `</span>` de dentro — devolvia *"1/10 abaixo da primeira metade"* e as
   * asserções comparavam a coisa errada (ou "" contra "", e passavam por
   * acidente). Tirar a marcação e procurar no texto é o que não se engana.
   */
  const metricasDoPapel = (html: string) => {
    const blocos = html.match(/<div class="metrica">[\s\S]*?<\/div>/g) ?? [];
    return blocos.map((b) => ({
      rotulo: /<span class="rotulo">([^<]*)<\/span>/.exec(b)?.[1] ?? "?",
      texto: b.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
    }));
  };

  const papel = (idioma: "en" | "pt") =>
    renderPatientReportHTML({ ...dados } as any, { idioma });

  it("**toda métrica que o papel imprime traz a sua frase**", () => {
    for (const idioma of ["en", "pt"] as const) {
      const html = papel(idioma);
      const metricas = metricasDoPapel(html);
      /* Se o papel não desenhar métricas, a asserção abaixo não mede nada. */
      expect(metricas.length).toBeGreaterThanOrEqual(7);

      const frases = Object.values(COMO_FOI_CALCULADO).map((f) => f[idioma]);
      const mudas = metricas
        .filter((m) => !frases.some((f) => m.texto.includes(f)))
        .map((m) => m.rotulo);
      expect(mudas).toEqual([]);
    }
  });

  /**
   * O rótulo de cada métrica e o campo de que ela vem.
   *
   * **Achado G10 do QA.** A asserção acima mede *"traz **alguma** frase"* —
   * `frases.some(...)`. O QA mutou uma 8ª métrica para imprimir a frase **de
   * outra** (os passos num rótulo de carga de treino) e os 3.793 testes
   * passaram. O nome do teste diz *"traz **a sua** frase"*, e é isso que este
   * par mede.
   */
  const PARES: Record<"en" | "pt", Array<[string, string]>> = {
    en: [
      ["Sleep", "sleepDuration"],
      ["Resting heart rate", "restingHr"],
      ["HRV", "hrv"],
      ["SpO2", "spo2"],
      ["Steps", "steps"],
      ["Systolic", "systolic"],
      ["Diastolic", "diastolic"],
      ["Pain", "painLevel"],
      ["Mood", "moodLevel"],
    ],
    pt: [
      ["Sono", "sleepDuration"],
      ["Frequência cardíaca em repouso", "restingHr"],
      ["VFC", "hrv"],
      ["SpO2", "spo2"],
      ["Passos", "steps"],
      ["Sistólica", "systolic"],
      ["Diastólica", "diastolic"],
      ["Dor", "painLevel"],
      ["Humor", "moodLevel"],
    ],
  };

  it("**e é a frase DELA, não a de outra métrica**", () => {
    for (const idioma of ["en", "pt"] as const) {
      const porRotulo = new Map(
        metricasDoPapel(papel(idioma)).map((m) => [m.rotulo, m.texto])
      );
      /* Se os rótulos mudarem, isto cai — e é o que se quer. */
      const semRotulo = PARES[idioma].filter(([r]) => !porRotulo.has(r)).map(([r]) => r);
      expect(semRotulo).toEqual([]);

      const erradas = PARES[idioma]
        .filter(([rotulo, campo]) => !porRotulo.get(rotulo)!.includes(comoFoiCalculado(campo, idioma)!))
        .map(([rotulo]) => rotulo);
      expect(erradas).toEqual([]);
    }
  });

  it("**a Dor e o Humor também** — eram as duas que saíam mudas", () => {
    const html = papel("pt");
    const porRotulo = new Map(metricasDoPapel(html).map((m) => [m.rotulo, m.texto]));
    expect(porRotulo.get("Dor")).toContain(comoFoiCalculado("painLevel", "pt")!);
    expect(porRotulo.get("Humor")).toContain(comoFoiCalculado("moodLevel", "pt")!);
  });

  it("e a frase vem **depois** da contagem de dias, não em vez dela", () => {
    /*
     * As duas coisas são diferentes: *"média dos 5 dias com dados"* diz quantos
     * dias entraram, e a frase diz como cada dia foi feito. Trocar uma pela
     * outra perderia metade da informação.
     */
    const nota = metricasDoPapel(papel("pt")).find((m) => m.rotulo === "SpO2")?.texto ?? "";
    expect(nota).toMatch(/dias com dados/);
    expect(nota).toContain(comoFoiCalculado("spo2", "pt")!);
    expect(nota.indexOf("dias com dados")).toBeLessThan(
      nota.indexOf(comoFoiCalculado("spo2", "pt")!)
    );
  });

  it("as do mapa que o papel não imprime não precisam de frase", () => {
    /*
     * Dito para a próxima pessoa não encher o mapa de frases para campos que
     * ninguém mostra — uma frase que nunca sai é uma frase que ninguém revê.
     */
    const noMapaSemFrase = Object.keys(ONDE_MORA).filter((c) => !COMO_FOI_CALCULADO[c]);
    expect(noMapaSemFrase).toContain("awakeMinutes");
  });
});
