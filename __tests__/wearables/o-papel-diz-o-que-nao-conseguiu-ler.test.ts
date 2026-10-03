/**
 * @jest-environment node
 *
 * O `getPatientReportData` nomeia o que não conseguiu ler (120 T-1).
 *
 * ## Porque este ficheiro existe
 *
 * A 1ª rodada do QA achou oito `.catch(() => null)` neste caminho — o achado
 * mais grave dela. Eu troquei-os por `lerOuFalhar` e **não escrevi teste**. A
 * 2ª rodada mediu a consequência:
 *
 * ```
 * --- o lerOuFalhar do documento deixa de registar o nome ---
 * Test Suites: 263 passed · Tests: 3793 passed   <<< NADA MORREU
 * ```
 *
 * E não era teoria: na mesma noite, uma correcção minha noutro ficheiro
 * **desapareceu** da árvore — outro agente restaurou-o de um snapshot anterior
 * — e a suíte continuou verde, porque esse conserto também não tinha teste. Um
 * conserto sem teste é um conserto que se perde.
 *
 * ## O que se mede aqui
 *
 * Os oito nomes, um a um, com o `prisma` a **rejeitar de verdade**. E as duas
 * coisas que a 2ª rodada mostrou estarem erradas em cima disto: a leitura do
 * paciente a virar *"esta pessoa não existe"*, e o modelo ausente a escapar
 * por fora do `try`.
 */

const leitores = {
  paciente: ["user", "findUnique"],
  triagem: ["medicalScreening", "findUnique"],
  avaliacao: ["bodyAssessment", "findFirst"],
  "avaliacao-clinica": ["aIDiagnosis", "findFirst"],
  protocolos: ["treatmentProtocol", "findMany"],
  notas: ["sOAPNote", "findMany"],
  atlas: ["atlasChatMessage", "count"],
} as const;

jest.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    medicalScreening: { findUnique: jest.fn() },
    bodyAssessment: { findFirst: jest.fn() },
    aIDiagnosis: { findFirst: jest.fn() },
    treatmentProtocol: { findMany: jest.fn() },
    sOAPNote: { findMany: jest.fn() },
    atlasChatMessage: { count: jest.fn() },
  },
}));
jest.mock("@/lib/patient-monitoring", () => {
  const real = jest.requireActual("@/lib/patient-monitoring");
  return { ...real, getMonitoringData: jest.fn() };
});

import { prisma } from "@/lib/db";
import { getMonitoringData } from "@/lib/patient-monitoring";
import { getPatientReportData, renderPatientReportHTML } from "@/lib/patient-report";

const PACIENTE = {
  id: "p1",
  firstName: "Prova",
  lastName: "120",
  email: "p@example.test",
  dateOfBirth: new Date("1980-01-01T00:00:00Z"),
  createdAt: new Date("2026-01-01T00:00:00Z"),
  reportLanguage: "pt",
  clinic: { name: "BPR Clinic", city: "Ipswich", country: "GB" },
};

const ACOMPANHAMENTO = {
  naoLidos: [],
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
};

/** Todos respondem; os nomeados rejeitam. */
const comFalhaEm = (...quais: string[]) => {
  const vazios: Record<string, unknown> = {
    paciente: PACIENTE,
    triagem: null,
    avaliacao: null,
    "avaliacao-clinica": null,
    protocolos: [],
    notas: [],
    atlas: 0,
  };
  for (const [nome, [modelo, metodo]] of Object.entries(leitores)) {
    const m = (prisma as any)[modelo][metodo] as jest.Mock;
    m.mockReset();
    if (quais.includes(nome)) m.mockRejectedValue(new Error(`banco em baixo: ${nome}`));
    else m.mockResolvedValue(vazios[nome]);
  }
  const mon = getMonitoringData as jest.Mock;
  mon.mockReset();
  if (quais.includes("acompanhamento")) mon.mockRejectedValue(new Error("banco em baixo"));
  else mon.mockResolvedValue(ACOMPANHAMENTO);
};

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

describe("cada leitura tem nome quando falha", () => {
  it("**tudo normal → `naoLidos` vazio**", async () => {
    comFalhaEm();
    const d = await getPatientReportData("p1");
    expect(d.naoLidos).toEqual([]);
    expect(d.patient).toEqual(PACIENTE);
  });

  for (const nome of [...Object.keys(leitores), "acompanhamento"]) {
    it(`**${nome}** a falhar aparece em \`naoLidos\``, async () => {
      comFalhaEm(nome);
      const d = await getPatientReportData("p1");
      expect(d.naoLidos).toContain(nome);
      /* E o log nomeia-o, para quem lê o contentor. */
      expect(erros.join("\n")).toContain(nome);
    });
  }

  it("**duas falhas, dois nomes**", async () => {
    comFalhaEm("triagem", "protocolos");
    const d = await getPatientReportData("p1");
    expect(d.naoLidos.sort()).toEqual(["protocolos", "triagem"]);
  });

  it("**as oito são nomeáveis** — nenhuma falha anónima", async () => {
    const todas = [...Object.keys(leitores), "acompanhamento"];
    comFalhaEm(...todas);
    const d = await getPatientReportData("p1");
    expect(d.naoLidos.sort()).toEqual([...todas].sort());
  });

  it("**e junta o que o acompanhamento não leu** — uma lista, não duas", async () => {
    comFalhaEm();
    (getMonitoringData as jest.Mock).mockResolvedValue({
      ...ACOMPANHAMENTO,
      naoLidos: ["pressao", "ecg"],
    });
    comFalhaEm("triagem");
    (getMonitoringData as jest.Mock).mockResolvedValue({
      ...ACOMPANHAMENTO,
      naoLidos: ["pressao", "ecg"],
    });
    const d = await getPatientReportData("p1");
    expect(d.naoLidos.sort()).toEqual(["ecg", "pressao", "triagem"]);
  });
});

describe("o modelo ausente não escapa (achado G2/§2)", () => {
  it("**um modelo `undefined` entra em `naoLidos`**, e não sobe como 500", async () => {
    /*
     * O `lerOuFalhar` recebia a **promessa**, que é um argumento: avaliada antes
     * de o corpo correr. Com `(prisma as any).<modelo>` em `undefined` — um
     * `prisma generate` esquecido, um modelo renomeado —, o `TypeError` subia do
     * literal do array, o `Promise.all` nunca nascia, e `naoLidos` ficava vazio.
     *
     * Ou seja: coluna em falta era apanhada; **modelo** em falta escapava. Era o
     * único caminho que fugia à função escrita para o apanhar.
     */
    comFalhaEm();
    const guardado = (prisma as any).medicalScreening;
    (prisma as any).medicalScreening = undefined;
    try {
      const d = await getPatientReportData("p1");
      expect(d.naoLidos).toContain("triagem");
      expect(d.patient).toEqual(PACIENTE);
    } finally {
      (prisma as any).medicalScreening = guardado;
    }
  });
});

describe("falhar a ler o paciente não é o paciente não existir (achado G3)", () => {
  it("**o papel diz que não conseguiu ler**, e não 'Patient not found'", async () => {
    /*
     * Isto devolvia 43 caracteres — `<html><body>Patient not found</body></html>`
     * — nas duas línguas, com `"paciente"` já dentro do `naoLidos`. Toda a
     * máquina da T-1 era calculada e descartada por um `return` cedo.
     */
    comFalhaEm("paciente");
    const d = await getPatientReportData("p1");
    expect(d.naoLidos).toContain("paciente");

    for (const idioma of ["pt", "en"] as const) {
      const html = renderPatientReportHTML(d as any, { idioma });
      expect(html).not.toContain("Patient not found");
      expect(html).toMatch(idioma === "pt" ? /não pôde ser lida/ : /could not be read/);
      expect(html).toContain(idioma === "pt" ? "seus dados" : "your details");
    }
  });

  it("**e um paciente que de facto não existe continua a dar 'not found'**", async () => {
    /* Os dois casos são diferentes, e continuam a ler-se diferentes. */
    comFalhaEm();
    ((prisma as any).user.findUnique as jest.Mock).mockResolvedValue(null);
    const d = await getPatientReportData("p1");
    expect(d.naoLidos).toEqual([]);
    expect(renderPatientReportHTML(d as any, { idioma: "pt" })).toContain("Patient not found");
  });
});
