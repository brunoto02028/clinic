/**
 * @jest-environment node
 *
 * Quem lê o resultado primeiro — e a resposta é **a pessoa** (26/09/2026).
 *
 * Este arquivo testava o contrário: que quem tinha relação clínica esperava o
 * terapeuta ler e liberar. Era o desenho de 081, e fazia sentido enquanto o
 * exame era da clínica. Deixou de fazer quando ele virou um produto que
 * qualquer pessoa compra, e o Bruno fechou assim:
 *
 *   > "os resultados do laboratório vão para o paciente... nada é associado;
 *   > pelo contrato, nós facilitamos a vida do paciente dando acesso a exames
 *   > privados, e depois de receber os exames as pessoas podem enviar para o
 *   > médico de sua preferência"
 *
 * O que estes testes guardam agora é que **código e contrato não discordam**:
 * os termos publicados dizem, em duas línguas, que ninguém da clínica lê antes.
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    appointment: { count: jest.fn() },
    patientPackage: { count: jest.fn() },
    user: { updateMany: jest.fn() },
  },
}));

import { prisma } from "@/lib/db";
import { reviewModeFor, nonDiagnosticCopy, markAsClinicPatient } from "../../lib/lab-review-mode";
import { labStage } from "../../lib/lab-stage";

const P = prisma as any;

beforeEach(() => jest.clearAllMocks());

describe("o resultado sai direto, para todo mundo", () => {
  it("quem nunca foi atendido: DIRECT", async () => {
    expect(await reviewModeFor("p1", "clinic-A")).toBe("DIRECT");
  });

  it("quem tem consulta no histórico: DIRECT também", async () => {
    // Era `THERAPIST`. Ser paciente da clínica deixou de segurar o resultado.
    P.appointment.count.mockResolvedValue(3);
    expect(await reviewModeFor("p1", "clinic-A")).toBe("DIRECT");
  });

  it("quem tem pacote ativo: DIRECT também", async () => {
    P.patientPackage.count.mockResolvedValue(1);
    expect(await reviewModeFor("p1", "clinic-A")).toBe("DIRECT");
  });

  it("e sem clínica nenhuma: DIRECT", async () => {
    expect(await reviewModeFor("p1", null)).toBe("DIRECT");
  });

  it("nem consulta o banco para decidir — não há o que perguntar", async () => {
    await reviewModeFor("p1", "clinic-A");
    expect(P.appointment.count).not.toHaveBeenCalled();
    expect(P.patientPackage.count).not.toHaveBeenCalled();
  });
});

describe("o estágio: resultado que chega é resultado liberado", () => {
  const pedido = (over: Record<string, unknown> = {}) => ({
    status: "RESULTS_READY" as const,
    releasedToPatientAt: null,
    registrations: [],
    ...over,
  });

  it("`RESULTS_READY` vira `released`, sem passar por `in_review`", () => {
    expect(labStage(pedido() as any)).toBe("released");
  });

  it("mesmo num pedido antigo gravado como THERAPIST", () => {
    // A coluna continua no banco e pode trazer o valor antigo; ela não decide
    // mais nada.
    expect(labStage(pedido({ reviewMode: "THERAPIST" }) as any)).toBe("released");
  });

  it("um pedido já liberado segue liberado", () => {
    expect(labStage(pedido({ status: "PROCESSING_LAB", releasedToPatientAt: new Date() }) as any)).toBe("released");
  });

  it("e os estágios anteriores não mudaram", () => {
    expect(labStage(pedido({ status: "CONFIRMED" }) as any)).toBe("kit_preparing");
    expect(labStage(pedido({ status: "KIT_DISPATCHED" }) as any)).toBe("register_kit");
    expect(labStage(pedido({ status: "PROCESSING_LAB" }) as any)).toBe("at_lab");
    expect(labStage(pedido({ status: "CANCELLED_LAB" }) as any)).toBe("cancelled");
  });
});

describe("a frase de não-diagnóstico", () => {
  it("é uma só, e não afirma revisão nenhuma", () => {
    const c = nonDiagnosticCopy();
    expect(c.en).not.toMatch(/therapist has reviewed/i);
    expect(c.pt).not.toMatch(/terapeuta os revisou/i);
    expect(c.en).toMatch(/Nobody has reviewed them for you/);
    expect(c.pt).toMatch(/Ninguém os revisou para você/);
  });

  it("e diz o que a pessoa pode fazer: escolher com quem compartilhar", () => {
    const c = nonDiagnosticCopy();
    expect(c.en).toMatch(/share them with a clinician of your choice/);
    expect(c.pt).toMatch(/compartilhe com um profissional de saúde da sua escolha/);
  });

  it("não aceita mais argumento — não há dois casos", () => {
    expect(nonDiagnosticCopy.length).toBe(0);
  });
});

describe("comprar exame continua não fazendo ninguém paciente", () => {
  it("`markAsClinicPatient` só vai de false para true", async () => {
    await markAsClinicPatient("p1", "clinic-A");
    expect(P.user.updateMany).toHaveBeenCalledWith({
      where: { id: "p1", clinicId: "clinic-A", role: "PATIENT", isClinicPatient: false },
      data: { isClinicPatient: true },
    });
  });
});

describe("o texto e o código dizem a mesma coisa", () => {
  it("o consentimento promete o que o código faz", async () => {
    const { LAB_TESTS_CONSENT } = await import("../../lib/lab-consent");
    const en = LAB_TESTS_CONSENT["en-GB"].points.join(" ");
    expect(en).toMatch(/Nobody at the clinic reads it first/);
    // E o código concorda: nenhum caminho devolve THERAPIST.
    expect(await reviewModeFor("p1", "clinic-A")).toBe("DIRECT");
  });
});

describe("não sobrou nenhum caminho de liberação", () => {
  const fs = require("fs");
  const path = require("path");
  const raiz = path.join(__dirname, "..", "..");
  const existe = (...p: string[]) => fs.existsSync(path.join(raiz, ...p));
  const ler = (...p: string[]) => fs.readFileSync(path.join(raiz, ...p), "utf8");

  it("a rota que liberava não existe mais", () => {
    expect(existe("app", "api", "admin", "labs", "orders", "[id]", "release", "route.ts")).toBe(false);
  });

  it("a tela do pedido não tem mais botão de liberar nem campo de nota", () => {
    const tela = ler("app", "admin", "labs", "orders", "[id]", "page.tsx");
    expect(tela).not.toMatch(/data-testid="lab-release"/);
    expect(tela).not.toMatch(/data-testid="lab-note-en"/);
    // E diz, na própria tela, para onde o resultado vai.
    expect(tela).toContain('data-testid="lab-goes-direct"');
  });

  it("a lista não oferece mais o filtro de fila", () => {
    // Sem comentários: o arquivo **cita** "waiting" para explicar que ele saiu.
    const lista = ler("app", "admin", "labs", "orders", "page.tsx")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(lista).not.toMatch(/"waiting"/);
    expect(lista).not.toMatch(/awaitingBadge/);
  });

  it("o contador da fila devolve zero sem ir ao banco", () => {
    const admin = ler("lib", "lab-admin.ts");
    expect(admin).toMatch(/export async function labResultsAwaitingRelease\(_clinicId: string\): Promise<number> \{\s*return 0;/);
  });

  it("e o app não promete mais nota de terapeuta nem data de revisão", () => {
    const tela = ler("mobile", "app", "(app)", "(lab)", "result", "[id].tsx");
    expect(tela).not.toMatch(/Your therapist's note/);
    expect(tela).not.toMatch(/reviewed", pt: "revisado em/);
    expect(tela).toMatch(/Share with your therapist/);
    // O botão depende de ter terapeuta, não de um modo que acabou.
    expect(tela).toMatch(/\{temClinica && \(/);
    expect(tela).not.toMatch(/r\.reviewMode === "THERAPIST"/);
  });
});
