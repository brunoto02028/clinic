/**
 * @jest-environment node
 *
 * O exame é independente da clínica (081, corrigido em 26/09/2026).
 *
 * O desenho original supunha que todo exame era de um paciente em tratamento,
 * e que o terapeuta lia antes. Não é: alguém que ouviu falar do app por um
 * amigo baixa, se cadastra e compra um exame sem nunca ter sido atendido. Não
 * há terapeuta nessa relação — e segurar o resultado dessa pessoa seria prender
 * o que é dela esperando alguém que nunca vai olhar.
 *
 * A revisão pertence à **relação clínica**, não ao exame.
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    appointment: { count: jest.fn() },
    patientPackage: { count: jest.fn() },
  },
}));

import { prisma } from "@/lib/db";
import { reviewModeFor, needsRelease, releasesOnArrival, nonDiagnosticCopy } from "../../lib/lab-review-mode";
import { labStage, stageCopy } from "../../lib/lab-stage";

const consultas = (prisma as any).appointment.count as jest.Mock;
const pacotes = (prisma as any).patientPackage.count as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  consultas.mockResolvedValue(0);
  pacotes.mockResolvedValue(0);
});

describe("reviewModeFor", () => {
  it("quem nunca foi atendido compra e recebe direto", async () => {
    expect(await reviewModeFor("p1", "clinic-A")).toBe("DIRECT");
  });

  it("quem já foi atendido tem terapeuta para revisar", async () => {
    consultas.mockResolvedValue(1);
    expect(await reviewModeFor("p1", "clinic-A")).toBe("THERAPIST");
  });

  it("pacote comprado também é relação — pagou pelo tratamento", async () => {
    pacotes.mockResolvedValue(1);
    expect(await reviewModeFor("p1", "clinic-A")).toBe("THERAPIST");
  });

  it("sem clínica nenhuma, direto — e sem tocar no banco", async () => {
    expect(await reviewModeFor("p1", null)).toBe("DIRECT");
    expect(consultas).not.toHaveBeenCalled();
  });
});

describe("o estágio que o comprador vê", () => {
  const pedido = (over: Record<string, unknown> = {}) => ({
    status: "RESULTS_READY" as const,
    releasedToPatientAt: null,
    registrations: [],
    ...over,
  });

  it("pedido direto: o resultado chegou é o resultado pronto", () => {
    expect(labStage(pedido({ reviewMode: "DIRECT" }))).toBe("released");
  });

  it("pedido com terapeuta: espera a revisão", () => {
    expect(labStage(pedido({ reviewMode: "THERAPIST" }))).toBe("in_review");
  });

  it("sem modo declarado conta como direto — nada fica preso por omissão", () => {
    expect(labStage(pedido())).toBe("released");
  });

  it("o texto de 'resultado pronto' não afirma que alguém revisou", () => {
    const c = stageCopy("released", 2);
    expect(c.en.body.toLowerCase()).not.toContain("therapist");
    expect(c.pt.body.toLowerCase()).not.toContain("terapeuta");
  });
});

describe("a frase de não-diagnóstico diz a verdade sobre quem leu", () => {
  it("com terapeuta, diz que ele revisou", () => {
    expect(nonDiagnosticCopy("THERAPIST").en).toContain("Your therapist has reviewed");
    expect(nonDiagnosticCopy("THERAPIST").pt).toContain("Seu terapeuta os revisou");
  });

  it("direto, diz que ninguém revisou — e o que fazer se preocupar", () => {
    expect(nonDiagnosticCopy("DIRECT").en).toContain("Nobody has reviewed them");
    expect(nonDiagnosticCopy("DIRECT").pt).toContain("Ninguém os revisou");
    expect(nonDiagnosticCopy("DIRECT").en.toLowerCase()).not.toContain("your therapist has reviewed");
  });
});

describe("quem espera a clínica", () => {
  it("só o pedido com terapeuta, e só enquanto não liberado", () => {
    expect(needsRelease({ reviewMode: "THERAPIST", releasedToPatientAt: null })).toBe(true);
    expect(needsRelease({ reviewMode: "THERAPIST", releasedToPatientAt: new Date() })).toBe(false);
    expect(needsRelease({ reviewMode: "DIRECT", releasedToPatientAt: null })).toBe(false);
  });

  it("o pedido direto se libera ao chegar", () => {
    expect(releasesOnArrival("DIRECT")).toBe(true);
    expect(releasesOnArrival("THERAPIST")).toBe(false);
  });
});
