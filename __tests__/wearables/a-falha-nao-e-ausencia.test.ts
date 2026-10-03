/**
 * @jest-environment node
 *
 * Uma falha de leitura **não** é a mesma coisa que não haver dado (120 T-1).
 *
 * ## O achado
 *
 * `lib/patient-monitoring.ts` tinha seis `.catch(() => [])`. Um
 * `connection refused` de meio segundo produzia um relatório clínico sem ECG,
 * sem pressão, sem adesão — **idêntico** ao de um paciente que nunca mediu
 * nada. O papel vai à mão de um médico, e um médico lê a ausência como
 * informação.
 *
 * O pior: cinco eram anteriores, e o sexto entrou em 02/10, na correcção que
 * fez o ECG voltar ao papel. A correcção **adoptou o padrão** em vez de o
 * questionar.
 *
 * `app/api/patient/reports/route.ts` fazia o mesmo na lista: um `[]` por falha,
 * e a tela do paciente escrevia *"ainda não há relatórios"* sobre uma lista que
 * podia ter dez.
 *
 * ## A regra deste ficheiro
 *
 * **Três estados, e não dois.** *Tem dado*, *não tem dado*, *não conseguimos
 * ler*. Um teste que só compare cheio com vazio não mede nada aqui.
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    wearableDataPoint: { findMany: jest.fn() },
    bloodPressureReading: { findMany: jest.fn() },
    exerciseCompletionLog: { findMany: jest.fn() },
    dailyCheckIn: { findMany: jest.fn() },
    appointment: { findMany: jest.fn() },
    ecgRecording: { findMany: jest.fn() },
  },
}));

import { prisma } from "@/lib/db";
import { getMonitoringData } from "@/lib/patient-monitoring";
import { renderPatientReportHTML } from "@/lib/patient-report";

const leitores = [
  "wearableDataPoint",
  "bloodPressureReading",
  "exerciseCompletionLog",
  "dailyCheckIn",
  "appointment",
  "ecgRecording",
] as const;

/** Cada leitor responde `[]`, menos os que se mandar rejeitar. */
const comFalhaEm = (...quais: string[]) => {
  for (const nome of leitores) {
    const m = (prisma as any)[nome].findMany as jest.Mock;
    m.mockReset();
    if (quais.includes(nome)) {
      m.mockRejectedValue(new Error(`banco em baixo: ${nome}`));
    } else {
      m.mockResolvedValue([]);
    }
  }
};

/** O log de erro não polui a saída do jest — mas confirma-se que ele sai. */
let erros: string[] = [];
beforeEach(() => {
  erros = [];
  jest.spyOn(console, "error").mockImplementation((...a: any[]) => {
    erros.push(a.map(String).join(" "));
  });
});
afterEach(() => {
  (console.error as any).mockRestore?.();
});

describe("o acompanhamento diz o que não conseguiu ler", () => {
  it("**tudo normal → `naoLidos` vazio**", async () => {
    comFalhaEm();
    const mon = await getMonitoringData("p1", { days: 30 });
    expect(mon.naoLidos).toEqual([]);
  });

  it("**o ECG a falhar nomeia o ECG** — e não some em silêncio", async () => {
    /*
     * Era este o caso concreto: o `.catch(() => [])` do `ecgRecording` fazia a
     * secção de ECG desaparecer do papel, exactamente como num paciente que
     * nunca gravou. E foi o `catch` que eu próprio acrescentei a corrigir outra
     * coisa.
     */
    comFalhaEm("ecgRecording");
    const mon = await getMonitoringData("p1", { days: 30 });
    expect(mon.naoLidos).toEqual(["ecg"]);
    expect(mon.ecg).toEqual([]);
    /* E o resto do papel continua a sair: uma secção não derruba o documento. */
    expect(mon.periodo.dias).toBe(30);
  });

  it("**duas falhas, dois nomes**", async () => {
    comFalhaEm("bloodPressureReading", "dailyCheckIn");
    const mon = await getMonitoringData("p1", { days: 30 });
    expect(mon.naoLidos.sort()).toEqual(["checkins", "pressao"]);
  });

  it("**as seis leituras são nomeáveis** — nenhuma falha anónima", async () => {
    comFalhaEm(...leitores);
    const mon = await getMonitoringData("p1", { days: 30 });
    expect(mon.naoLidos.sort()).toEqual([
      "checkins",
      "consultas",
      "ecg",
      "exercicio",
      "pressao",
      "wearables",
    ]);
  });

  it("e a falha também vai para o log, com o nome dela", async () => {
    comFalhaEm("wearableDataPoint");
    await getMonitoringData("p1", { days: 30 });
    expect(erros.join("\n")).toMatch(/wearables/);
  });

  it("**uma leitura vazia não é uma falha**", async () => {
    /*
     * A distinção nos dois sentidos. Um paciente que não mediu nada tem seis
     * listas vazias e `naoLidos` vazio — e o papel não pode avisar nada.
     */
    comFalhaEm();
    const mon = await getMonitoringData("p1", { days: 30 });
    expect(mon.naoLidos).toEqual([]);
    expect(mon.temSinais).toBe(false);
    expect(mon.pressao.leituras).toBe(0);
  });
});

describe("e o papel escreve-o, nas duas línguas", () => {
  const papel = (naoLidos: string[], idioma: "en" | "pt") =>
    renderPatientReportHTML(
      {
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
          naoLidos,
          periodo: { de: "2026-09-02", ate: "2026-10-02", dias: 30 },
          series: {},
          sinais: {
            sono: { atual: 420, anterior: 410, variacao: 10, dias: 8 },
            fcRepouso: { atual: 55, anterior: 57, variacao: -2, dias: 8 },
            hrv: { atual: null, anterior: null, variacao: null, dias: 0 },
            spo2: { atual: null, anterior: null, variacao: null, dias: 0 },
            passos: { atual: null, anterior: null, variacao: null, dias: 0 },
          },
          temSinais: true,
          pressao: {
            leituras: 0,
            sistolica: { atual: null, anterior: null, variacao: null, dias: 0 },
            diastolica: { atual: null, anterior: null, variacao: null, dias: 0 },
          },
          comoSeSentiu: {
            registros: 0,
            ultimos: [],
            dor: { atual: null, anterior: null, variacao: null, dias: 0 },
            humor: { atual: null, anterior: null, variacao: null, dias: 0 },
          },
          exercicio: { registros: 0, diasComExercicio: 0 },
          consultas: [],
          ecg: [],
        },
      } as any,
      { idioma }
    );

  it("**com falha, a ressalva aparece** — e nomeia o que falta", () => {
    const en = papel(["ecg"], "en");
    expect(en).toContain("could not be read");
    expect(en).toContain("ECG recordings");
    /* A parte que importa: o que falta **pode existir**. */
    expect(en).toMatch(/may well exist/);

    const pt = papel(["ecg"], "pt");
    expect(pt).toContain("não pôde ser lida");
    expect(pt).toContain("gravações de ECG");
    expect(pt).toMatch(/pode existir/);
  });

  it("**sem falha, a ressalva não aparece** — senão vira ruído fixo", () => {
    /* Um aviso que está sempre lá não avisa de nada. */
    expect(papel([], "en")).not.toContain("could not be read");
    expect(papel([], "pt")).not.toContain("não pôde ser lida");
  });

  it("**aparece em três lugares: no topo, no lugar da secção e no rodapé**", () => {
    /*
     * Um papel de várias páginas entra-se por qualquer uma. É o mesmo raciocínio
     * que pôs a escala e a ressalva em **cada** folha do ECG: quem olha só para
     * o fim não alcança o aviso do topo.
     *
     * O terceiro lugar entrou depois do QA: a frase `naoFoiLidoNaSecao` estava
     * escrita nas duas línguas e **nunca era usada** — a secção simplesmente
     * desaparecia, e quem folheia o meio do papel não tinha como saber que ali
     * havia algo. Agora sai no lugar dela, com o título.
     */
    const pt = papel(["pressao"], "pt");
    expect(pt.split("não pôde ser lida").length - 1).toBe(3);
    /* E a do meio traz o título da secção que faltou. */
    expect(pt).toMatch(/<h2>Pressão arterial<\/h2>\s*<p>Esta seção não pôde ser lida/);

    const en = papel(["pressao"], "en");
    expect(en.split("could not be read").length - 1).toBe(3);
    expect(en).toMatch(/<h2>Blood pressure<\/h2>\s*<p>This section could not be read/);
  });

  it("**e a secção marcada não desenha a tabela vazia por cima**", () => {
    /* Marca **em vez de**, e não marca **e também**. */
    const pt = papel(["pressao"], "pt");
    expect(pt).not.toMatch(/mmHg/);
  });

  it("nomeia várias falhas de uma vez", () => {
    const pt = papel(["pressao", "ecg", "checkins"], "pt");
    expect(pt).toContain("pressão arterial");
    expect(pt).toContain("gravações de ECG");
    expect(pt).toContain("registros diários");
  });

  it("**todo nome que o código produz tem tradução** — nenhum slug no papel", () => {
    /*
     * **Achado da 2ª rodada do review.** O dicionário tinha só as seis leituras
     * do acompanhamento, e o `lerOuFalhar` do `getPatientReportData` acrescentou
     * oito nomes. O `?? k` fazia o papel do paciente dizer *"Estas seções
     * falharam: avaliacao-clinica, protocolos"* — slugs internos, sem acento,
     * iguais nas duas línguas, num documento que vai à mão de um médico.
     *
     * A lista abaixo é a dos nomes que os dois `lerOuFalhar` produzem. Um nome
     * novo sem tradução quebra isto.
     */
    const todos = [
      "wearables", "pressao", "exercicio", "checkins", "consultas", "ecg",
      "paciente", "triagem", "avaliacao", "avaliacao-clinica",
      "protocolos", "notas", "atlas", "acompanhamento",
    ];

    /**
     * **A lista de nomes dentro da frase**, e não o documento inteiro.
     *
     * A primeira versão desta asserção varria o papel todo e acusava
     * `consultas`, `notas`, `paciente` e `pressao` — porque são palavras que a
     * prosa do documento usa legitimamente. Uma asserção larga que acusa à toa
     * é uma asserção que a próxima pessoa desliga.
     */
    const nomesNaFrase = (doc: string, idioma: "pt" | "en") => {
      const abre =
        idioma === "pt"
          ? "falharam ao carregar na geração do relatório: "
          : "failed to load when the report was generated: ";
      const i = doc.indexOf(abre);
      if (i < 0) return "";
      return doc.slice(i + abre.length, doc.indexOf(".", i + abre.length));
    };

    for (const idioma of ["pt", "en"] as const) {
      const frase = nomesNaFrase(papel(todos, idioma), idioma);
      /* Se a frase não saiu, a asserção abaixo não mede nada. */
      expect(frase.length).toBeGreaterThan(50);
      const comoSlug = todos.filter((k) => frase.split(", ").includes(k));
      expect(comoSlug).toEqual([]);
    }
  });

  it("e um nome que o dicionário não conheça sai como veio, não desaparece", () => {
    /*
     * Uma leitura nova que alguém acrescente ao `lerOuFalhar` e esqueça no
     * dicionário: o papel diz o nome técnico, que é feio e verdadeiro. Deixá-la
     * cair fora da lista seria voltar à falha silenciosa.
     */
    expect(papel(["algoNovo"], "pt")).toContain("algoNovo");
  });
});
