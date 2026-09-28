/**
 * @jest-environment node
 *
 * Qual porta se abre quando o paciente toca em "Marcar".
 *
 * O app não pergunta que tipo de marcação é — só o servidor sabe se há sessão
 * no pacote, se a triagem foi feita e quanto custa. E o preço **nunca** vem do
 * cliente: um paciente já marcou a própria sessão por GBP 0,30.
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    appointment: { count: jest.fn() },
  },
}));
jest.mock("@/lib/package-sessions", () => ({ activePackageFor: jest.fn() }));
jest.mock("@/lib/service-price", () => ({
  // `servicePricesForPatient` substituiu `servicePricesForClinic` aqui na 082:
  // a exceção de preço do paciente vence a da clínica, e quem resolve isso é
  // uma função só. Mantidas as duas no mock para o teste falhar alto se alguém
  // voltar a chamar a versão sem paciente.
  servicePricesForClinic: jest.fn(),
  servicePricesForPatient: jest.fn(),
  patientBookingPrice: jest.fn(),
}));

import { prisma } from "@/lib/db";
import { activePackageFor } from "@/lib/package-sessions";
import { servicePricesForPatient, patientBookingPrice } from "@/lib/service-price";
import { bookingOptionsFor } from "@/lib/booking-options";

const users = (prisma as any).user;
const consultas = (prisma as any).appointment;

const paciente = (over: any = {}) =>
  users.findUnique.mockResolvedValue({
    clinicId: "clinicaA",
    medicalScreening: { isSubmitted: true },
    clinic: { extraSessionPayment: "INVOICE" },
    ...over,
  });

beforeEach(() => {
  jest.clearAllMocks();
  paciente();
  (activePackageFor as jest.Mock).mockResolvedValue(null);
  (servicePricesForPatient as jest.Mock).mockResolvedValue([
    { serviceType: "CONSULTATION", price: 80, currency: "GBP" },
    { serviceType: "TREATMENT_SESSION", price: 55, currency: "GBP" },
  ]);
  (patientBookingPrice as jest.Mock).mockResolvedValue(80);
  consultas.count.mockResolvedValue(0);
});

describe("bookingOptionsFor", () => {
  it("sem triagem: não marca, e diz por quê", async () => {
    paciente({ medicalScreening: { isSubmitted: false } });

    const r = await bookingOptionsFor("p1");

    expect(r.kind).toBeNull();
    expect(r.blockedReason).toBe("screening_required");
  });

  it("paciente novo com triagem: primeira consulta, paga no ato", async () => {
    const r = await bookingOptionsFor("p1");

    expect(r.kind).toBe("FIRST_CONSULTATION");
    expect(r.price).toBe(80);
    expect(r.requiresPayment).toBe(true);
  });

  it("com sessão no pacote: consome, e não cobra", async () => {
    (activePackageFor as jest.Mock).mockResolvedValue({
      patientPackageId: "pac1", included: 10, used: 4, remaining: 6, hasSession: true,
    });

    const r = await bookingOptionsFor("p1");

    expect(r.kind).toBe("PACKAGE_SESSION");
    expect(r.price).toBe(0);
    expect(r.requiresPayment).toBe(false);
    expect(r.sessionsRemaining).toBe(6);
    expect(r.patientPackageId).toBe("pac1");
  });

  it("a sessão comprada vem antes de qualquer cobrança", async () => {
    // Mesmo com histórico de consultas, quem tem sessão paga usa a sessão.
    consultas.count.mockResolvedValue(12);
    (activePackageFor as jest.Mock).mockResolvedValue({
      patientPackageId: "pac1", included: null, used: 12, remaining: null, hasSession: true,
    });

    expect((await bookingOptionsFor("p1")).kind).toBe("PACKAGE_SESSION");
  });

  it("em tratamento e sem sessão: extra, no preço da sessão avulsa", async () => {
    consultas.count.mockResolvedValue(3);

    const r = await bookingOptionsFor("p1");

    expect(r.kind).toBe("EXTRA_SESSION");
    expect(r.price).toBe(55);
    // O padrão é faturar depois: quem já está em tratamento você conhece.
    expect(r.requiresPayment).toBe(false);
  });

  it("a clínica pode exigir pagamento na extra", async () => {
    consultas.count.mockResolvedValue(3);
    paciente({ clinic: { extraSessionPayment: "AT_BOOKING" } });

    expect((await bookingOptionsFor("p1")).requiresPayment).toBe(true);
  });

  it("consulta cancelada não conta como história — a próxima ainda é a primeira", async () => {
    await bookingOptionsFor("p1");

    const status = consultas.count.mock.calls[0][0].where.status.in;
    expect(status).not.toContain("CANCELLED");
    expect(status).toContain("COMPLETED");
  });

  it("paciente sem clínica não marca", async () => {
    paciente({ clinicId: null });

    const r = await bookingOptionsFor("p1");
    expect(r.kind).toBeNull();
    expect(r.blockedReason).toBe("no_clinic");
  });
});
