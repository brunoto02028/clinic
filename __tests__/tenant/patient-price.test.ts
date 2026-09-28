/**
 * @jest-environment node
 *
 * A ordem de resolução do preço (082).
 *
 *     exceção do paciente → preço da clínica → padrão da plataforma → nada
 *
 * Uma função responde à tela e à marcação. Duas implementações da mesma
 * pergunta foi a N4 da 080: a tela prometia £88,50 e o servidor cobrava
 * £44,25.
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    clinic: { findUnique: jest.fn() },
    servicePrice: { findMany: jest.fn() },
    patientServicePrice: { findMany: jest.fn() },
  },
}));

import { prisma } from "@/lib/db";
import { servicePricesForPatient, patientBookingPrice } from "../../lib/service-price";

const clinic = (prisma as any).clinic.findUnique as jest.Mock;
const precos = (prisma as any).servicePrice.findMany as jest.Mock;
const excecoes = (prisma as any).patientServicePrice.findMany as jest.Mock;

const daClinica = (over: Record<string, unknown> = {}) => ({
  id: "sp1", serviceType: "CONSULTATION", name: "Initial Consultation",
  description: null, price: 100, currency: "GBP", ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  clinic.mockResolvedValue({ type: "CLINIC" });
  precos.mockResolvedValue([]);
  excecoes.mockResolvedValue([]);
});

describe("servicePricesForPatient", () => {
  it("sem exceção, o paciente vê o preço da clínica", async () => {
    precos.mockResolvedValueOnce([daClinica()]).mockResolvedValueOnce([]);
    const r = await servicePricesForPatient("clinic-A", "p1");
    expect(r.find((p) => p.serviceType === "CONSULTATION")?.price).toBe(100);
  });

  it("a exceção do paciente vence a da clínica", async () => {
    precos.mockResolvedValueOnce([daClinica()]).mockResolvedValueOnce([]);
    excecoes.mockResolvedValue([{ id: "e1", serviceType: "CONSULTATION", price: 80, currency: "GBP" }]);
    const r = await servicePricesForPatient("clinic-A", "p1");
    expect(r.find((p) => p.serviceType === "CONSULTATION")?.price).toBe(80);
  });

  it("zero é preço, não ausência — cortesia registrada", async () => {
    precos.mockResolvedValueOnce([daClinica()]).mockResolvedValueOnce([]);
    excecoes.mockResolvedValue([{ id: "e1", serviceType: "CONSULTATION", price: 0, currency: "GBP" }]);
    expect(await patientBookingPrice("clinic-A", "p1")).toBe(0);
  });

  it("exceção de serviço que a clínica não precificou existe por si", async () => {
    precos.mockResolvedValue([]);
    excecoes.mockResolvedValue([{ id: "e1", serviceType: "CONSULTATION", price: 55, currency: "GBP" }]);
    expect(await patientBookingPrice("clinic-A", "p1")).toBe(55);
  });

  it("a exceção é lida só da clínica e do paciente pedidos", async () => {
    excecoes.mockResolvedValue([]);
    await servicePricesForPatient("clinic-A", "p1");
    expect(excecoes.mock.calls[0][0].where).toEqual({ patientId: "p1", clinicId: "clinic-A" });
  });

  it("sem exceção e sem preço da clínica continua sendo null — nunca 60", async () => {
    expect(await patientBookingPrice("clinic-A", "p1")).toBeNull();
  });

  it("nada no que sai para o paciente anuncia que é exceção", async () => {
    precos.mockResolvedValueOnce([daClinica()]).mockResolvedValueOnce([]);
    excecoes.mockResolvedValue([{ id: "e1", serviceType: "CONSULTATION", price: 80, currency: "GBP" }]);
    const json = JSON.stringify(await servicePricesForPatient("clinic-A", "p1")).toLowerCase();
    for (const palavra of ["exception", "excecao", "discount", "desconto", "note"]) {
      expect(json).not.toContain(palavra);
    }
  });
});
