/**
 * @jest-environment node
 *
 * O resgate (084, T-4).
 *
 * Três propriedades, e cada uma existe por causa de um jeito real de perder
 * dinheiro ou prender uma campanha:
 *
 *   - **dois toques são um resgate** — senão o mesmo paciente consome o limite
 *     duas vezes por causa de um toque duplo;
 *   - **checkout que não nasce não consome limite** — senão a campanha morre de
 *     abas fechadas;
 *   - **reserva em andamento ocupa a vaga** — senão dois pacientes pagam o mesmo
 *     cupom de uso único ao mesmo tempo, e a clínica vende duas vezes.
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    coupon: { findUnique: jest.fn() },
    couponRedemption: {
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";
import {
  reservarCupom,
  liberarReserva,
  confirmarPorSessao,
  descartarPorSessao,
  anexarSessao,
  cupomStripe,
  JANELA_RESERVA_MS,
} from "../../lib/coupon-redemption";

const P = prisma as any;
const cupom = (over: Record<string, unknown> = {}) => ({
  id: "c1", clinicId: "clinic-A", code: "VERAO10", description: "Verão",
  discountPercent: 20, discountAmount: null, currency: "GBP",
  appliesTo: ["CONSULTATION"], patientId: null, startsAt: null, endsAt: null,
  maxRedemptions: null, maxPerPatient: 1, isActive: true, ...over,
});

const reservar = (over: Record<string, unknown> = {}) =>
  reservarCupom({
    clinicId: "clinic-A", patientId: "p1", code: "VERAO10",
    scope: "CONSULTATION", amount: 100, currency: "GBP", ...over,
  } as any);

beforeEach(() => {
  jest.clearAllMocks();
  P.coupon.findUnique.mockResolvedValue(cupom());
  P.couponRedemption.count.mockResolvedValue(0);
  P.couponRedemption.findFirst.mockResolvedValue(null);
  P.couponRedemption.create.mockResolvedValue({ id: "r1" });
  P.couponRedemption.update.mockResolvedValue({ id: "r1" });
  P.couponRedemption.updateMany.mockResolvedValue({ count: 1 });
  P.couponRedemption.deleteMany.mockResolvedValue({ count: 1 });
});

describe("sem código, nada acontece", () => {
  it("não toca no banco — é o caminho de quase todo mundo", async () => {
    const r = await reservar({ code: null });
    expect(r).toEqual({ tipo: "sem_cupom" });
    expect(P.coupon.findUnique).not.toHaveBeenCalled();
    expect(P.couponRedemption.create).not.toHaveBeenCalled();
  });

  it("string vazia é o mesmo que nada", async () => {
    expect((await reservar({ code: "   " })).tipo).toBe("sem_cupom");
    expect(P.coupon.findUnique).not.toHaveBeenCalled();
  });
});

describe("a reserva", () => {
  it("grava o resgate e devolve o valor a cobrar", async () => {
    const r = await reservar();
    expect(r.tipo).toBe("reservado");
    if (r.tipo === "reservado") {
      expect(r.reserva.final).toBe(80);
      expect(r.reserva.discount).toBe(20);
      expect(r.reserva.redemptionId).toBe("r1");
    }
    expect(P.couponRedemption.create).toHaveBeenCalledTimes(1);
  });

  it("nasce **não** confirmada — quem confirma é o webhook", async () => {
    await reservar();
    const dados = P.couponRedemption.create.mock.calls[0][0].data;
    expect(dados.confirmedAt).toBeUndefined();
  });

  it("cupom recusado não grava nada", async () => {
    P.coupon.findUnique.mockResolvedValue(cupom({ isActive: false }));
    const r = await reservar();
    expect(r.tipo).toBe("recusado");
    expect(P.couponRedemption.create).not.toHaveBeenCalled();
  });

  it("dois toques são um resgate: a reserva em aberto é reaproveitada", async () => {
    // O mock precisa ser um estado que o banco **produza**: uma reserva em
    // aberto existe (`findFirst` acha) e nenhuma confirmada (`count` = 0, que é
    // o que o filtro `confirmedAt: { not: null }` devolveria). O mock anterior
    // era contraditório, e foi por isso que o A-1 passou batido por aqui.
    P.couponRedemption.count.mockResolvedValue(0);
    P.couponRedemption.findFirst.mockResolvedValue({ id: "r-antiga" });
    const r = await reservar();
    expect(P.couponRedemption.create).not.toHaveBeenCalled();
    expect(P.couponRedemption.update).toHaveBeenCalledTimes(1);
    expect(P.couponRedemption.update.mock.calls[0][0].where).toEqual({ id: "r-antiga" });
    expect(r.tipo).toBe("reservado");
  });

  it("e o segundo toque solta a sessão antiga — senão o webhook dela confirmaria esta", async () => {
    P.couponRedemption.findFirst.mockResolvedValue({ id: "r-antiga" });
    await reservar();
    expect(P.couponRedemption.update.mock.calls[0][0].data.stripeSessionId).toBeNull();
  });

  it("só reaproveita reserva dentro da janela, e do mesmo escopo", async () => {
    await reservar();
    const w = P.couponRedemption.findFirst.mock.calls[0][0].where;
    expect(w.confirmedAt).toBeNull();
    expect(w.scope).toBe("CONSULTATION");
    expect(w.patientId).toBe("p1");
    expect(w.createdAt.gte).toBeInstanceOf(Date);
  });
});

describe("quem ocupa a vaga", () => {
  it("o limite da campanha conta confirmado **ou** reservado agora", async () => {
    P.coupon.findUnique.mockResolvedValue(cupom({ maxRedemptions: 1 }));
    await reservar();
    const where = P.couponRedemption.count.mock.calls[1][0].where;
    expect(where.OR).toEqual([
      { confirmedAt: { not: null } },
      { createdAt: { gte: expect.any(Date) } },
    ]);
  });

  it("a reserva a reaproveitar é achada ANTES de resolver o cupom", async () => {
    // A ordem é o conserto do N-1: é ela que sai da contagem, e só ela.
    P.couponRedemption.findFirst.mockResolvedValue({ id: "r-antiga" });
    await reservar();
    expect(P.couponRedemption.findFirst).toHaveBeenCalled();
    // Achada pela chave do cupom `(clinicId, code)`, sem precisar resolvê-lo antes.
    expect(P.couponRedemption.findFirst.mock.calls[0][0].where.coupon).toEqual({
      clinicId: "clinic-A",
      code: "VERAO10",
    });
  });

  it("a janela é a vida de uma sessão do Stripe — 24h, não uma hora escolhida por conforto", () => {
    // Uma hora abria 23h de buraco: a sessão do Stripe vive 24h, então dava para
    // reservar de novo com a antiga ainda válida e pagar as duas (N-1).
    expect(JANELA_RESERVA_MS).toBe(24 * 60 * 60 * 1000);
  });
});

describe("o ciclo de vida do resgate", () => {
  it("a sessão é anexada para o webhook achar", async () => {
    await anexarSessao("r1", "cs_test_1");
    expect(P.couponRedemption.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { stripeSessionId: "cs_test_1" },
    });
  });

  it("confirmar é idempotente: o reenvio da Stripe não acha nada para mudar", async () => {
    await confirmarPorSessao("cs_test_1");
    const w = P.couponRedemption.updateMany.mock.calls[0][0].where;
    expect(w).toEqual({ stripeSessionId: "cs_test_1", confirmedAt: null });
  });

  it("expirar só descarta o que não foi cobrado", async () => {
    await descartarPorSessao("cs_test_1");
    expect(P.couponRedemption.deleteMany.mock.calls[0][0].where).toEqual({
      stripeSessionId: "cs_test_1",
      confirmedAt: null,
    });
  });

  it("liberar nunca lança — é chamada de dentro de um catch", async () => {
    P.couponRedemption.delete.mockRejectedValue(new Error("já não existe"));
    const erro = jest.spyOn(console, "error").mockImplementation(() => {});
    await expect(liberarReserva("r1")).resolves.toBeUndefined();
    erro.mockRestore();
  });
});

describe("o cupom da Stripe, para o que é recorrente", () => {
  const reserva = {
    redemptionId: "r1", couponId: "c1", code: "VERAO10",
    original: 100, discount: 20, final: 80, percent: 20, currency: "GBP",
  };

  it("reaproveita um id determinístico em vez de criar um por adesão", async () => {
    const stripe = { coupons: { retrieve: jest.fn().mockResolvedValue({ id: "bpr-pct-VERAO10-20" }), create: jest.fn() } };
    const id = await cupomStripe(stripe as any, reserva);
    expect(id).toBe("bpr-pct-VERAO10-20");
    expect(stripe.coupons.create).not.toHaveBeenCalled();
  });

  it("cria uma vez quando ainda não existe, e só para a primeira cobrança", async () => {
    const stripe = {
      coupons: { retrieve: jest.fn().mockRejectedValue(new Error("No such coupon")), create: jest.fn().mockResolvedValue({}) },
    };
    await cupomStripe(stripe as any, reserva);
    const arg = stripe.coupons.create.mock.calls[0][0];
    expect(arg.percent_off).toBe(20);
    // `once`: o desconto vale na adesão, não em toda mensalidade.
    expect(arg.duration).toBe("once");
  });

  it("valor fixo vira amount_off em centavos, com a moeda", async () => {
    const stripe = {
      coupons: { retrieve: jest.fn().mockRejectedValue(new Error("nope")), create: jest.fn().mockResolvedValue({}) },
    };
    await cupomStripe(stripe as any, { ...reserva, percent: null, discount: 15 });
    const arg = stripe.coupons.create.mock.calls[0][0];
    expect(arg.amount_off).toBe(1500);
    expect(arg.currency).toBe("gbp");
    expect(arg.percent_off).toBeUndefined();
  });

  it("uma corrida entre duas adesões não derruba nenhuma das duas", async () => {
    const stripe = {
      coupons: {
        retrieve: jest.fn().mockRejectedValue(new Error("nope")),
        create: jest.fn().mockRejectedValue(new Error("Coupon already exists")),
      },
    };
    await expect(cupomStripe(stripe as any, reserva)).resolves.toBe("bpr-pct-VERAO10-20");
  });
});
