/**
 * @jest-environment node
 *
 * O preço que o paciente vê é o que a clínica configurou — ou não há oferta.
 *
 * O Bruno digitou £100 em /admin/service-pricing, deixou o interruptor
 * "Active" desligado, e o app ofereceu a primeira consulta por **£60**: um
 * número escrito no código anos atrás, que ninguém escolheu e que a tela não
 * mencionava em lugar nenhum (26/09/2026). O padrão silencioso é o defeito —
 * pior que não vender é vender pelo preço errado.
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    clinic: { findUnique: jest.fn() },
    servicePrice: { findMany: jest.fn() },
  },
}));

import { prisma } from "@/lib/db";
import { patientBookingPrice } from "../../lib/service-price";

const clinic = (prisma as any).clinic.findUnique as jest.Mock;
const prices = (prisma as any).servicePrice.findMany as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  clinic.mockResolvedValue({ type: "CLINIC" });
  prices.mockResolvedValue([]);
});

const linha = (over: Record<string, unknown> = {}) => ({
  id: "sp1", serviceType: "CONSULTATION", name: "Initial Consultation",
  description: null, price: 100, currency: "GBP", ...over,
});

it("sem preço configurado devolve null — nunca um número inventado", async () => {
  expect(await patientBookingPrice("clinic-A")).toBeNull();
});

it("nunca devolve o antigo 60", async () => {
  expect(await patientBookingPrice("clinic-A")).not.toBe(60);
});

it("com preço configurado devolve exatamente ele", async () => {
  prices.mockResolvedValueOnce([linha()]).mockResolvedValueOnce([]);
  expect(await patientBookingPrice("clinic-A")).toBe(100);
});

it("só lê linhas ativas — o interruptor da tela é o que vale", async () => {
  prices.mockResolvedValue([]);
  await patientBookingPrice("clinic-A");
  for (const call of prices.mock.calls) {
    expect(call[0].where.isActive).toBe(true);
  }
});

it("estúdio de personal continua em 0, que é decisão e não buraco", async () => {
  clinic.mockResolvedValue({ type: "PERSONAL_TRAINER" });
  expect(await patientBookingPrice("studio-A")).toBe(0);
});
