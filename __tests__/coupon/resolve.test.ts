/**
 * @jest-environment node
 *
 * O cupom vale? (084, T-1)
 *
 * Cada motivo de recusa tem o seu próprio teste **e a sua própria frase**. Não
 * é preciosismo: a F2 do QA da 082 foi uma recusa dizendo a coisa errada — quem
 * não tinha preço configurado era informado de que a conta não estava ligada a
 * uma clínica, e ia procurar ajuda no lugar errado.
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    coupon: { findUnique: jest.fn() },
    couponRedemption: { count: jest.fn() },
  },
}));

import { prisma } from "@/lib/db";
import { resolveCoupon, normalizeCode, type CouponRefusal } from "../../lib/coupon";

const acha = (prisma as any).coupon.findUnique as jest.Mock;
const conta = (prisma as any).couponRedemption.count as jest.Mock;

const cupom = (over: Record<string, unknown> = {}) => ({
  id: "c1",
  clinicId: "clinic-A",
  code: "VERAO10",
  description: "Campanha de verão",
  discountPercent: 10,
  discountAmount: null,
  currency: "GBP",
  appliesTo: ["CONSULTATION"],
  patientId: null,
  startsAt: null,
  endsAt: null,
  maxRedemptions: null,
  maxPerPatient: 1,
  isActive: true,
  ...over,
});

const pedir = (over: Record<string, unknown> = {}) =>
  resolveCoupon({
    clinicId: "clinic-A",
    patientId: "p1",
    code: "VERAO10",
    scope: "CONSULTATION",
    ...over,
  } as any);

beforeEach(() => {
  jest.clearAllMocks();
  acha.mockResolvedValue(cupom());
  conta.mockResolvedValue(0);
});

describe("normalizeCode", () => {
  it("maiúsculas e sem espaço nas pontas", () => {
    expect(normalizeCode("  verao10 ")).toBe("VERAO10");
  });

  it("qualquer coisa que não seja texto vira vazio, e vazio é recusa", () => {
    expect(normalizeCode(undefined)).toBe("");
    expect(normalizeCode(42)).toBe("");
  });
});

describe("o cupom vale", () => {
  it("cupom ativo, na janela, no escopo certo", async () => {
    const r = await pedir();
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.couponId).toBe("c1");
      expect(r.name).toBe("Campanha de verão");
      expect(r.discountPercent).toBe(10);
    }
  });

  it("caixa não importa — o paciente digita como quiser", async () => {
    await pedir({ code: "  verao10 " });
    expect(acha).toHaveBeenCalledWith({
      where: { clinicId_code: { clinicId: "clinic-A", code: "VERAO10" } },
    });
  });

  it("o tenant entra na consulta, então cupom de outra clínica nunca é achado", async () => {
    await pedir({ clinicId: "clinic-B" });
    expect(acha.mock.calls[0][0].where.clinicId_code.clinicId).toBe("clinic-B");
  });
});

describe("cada recusa tem o seu motivo", () => {
  const casos: Array<[CouponRefusal, () => void]> = [
    ["not_found", () => acha.mockResolvedValue(null)],
    ["inactive", () => acha.mockResolvedValue(cupom({ isActive: false }))],
    ["not_started", () => acha.mockResolvedValue(cupom({ startsAt: new Date("2099-01-01") }))],
    ["expired", () => acha.mockResolvedValue(cupom({ endsAt: new Date("2020-01-01") }))],
    ["wrong_scope", () => acha.mockResolvedValue(cupom({ appliesTo: ["MEMBERSHIP"] }))],
    ["not_for_you", () => acha.mockResolvedValue(cupom({ patientId: "outro" }))],
  ];

  it.each(casos)("%s", async (esperado, montar) => {
    montar();
    const r = await pedir();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe(esperado);
  });

  it("código vazio é `not_found`, e não vai ao banco", async () => {
    const r = await pedir({ code: "   " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("not_found");
    expect(acha).not.toHaveBeenCalled();
  });

  it("nenhuma frase se repete — senão duas recusas viram a mesma tela", async () => {
    const frases = new Set<string>();
    for (const [, montar] of casos) {
      jest.clearAllMocks();
      conta.mockResolvedValue(0);
      montar();
      const r = await pedir();
      if (!r.ok) frases.add(r.message);
    }
    expect(frases.size).toBe(casos.length);
  });

  it("toda recusa vem em inglês e em português", async () => {
    acha.mockResolvedValue(null);
    const r = await pedir();
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toMatch(/\w/);
      expect(r.messagePt).toMatch(/\w/);
      expect(r.messagePt).not.toBe(r.message);
    }
  });
});

describe("os limites", () => {
  it("`maxPerPatient` esgotado é `already_used`", async () => {
    conta.mockResolvedValue(1);
    const r = await pedir();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("already_used");
  });

  it("`maxRedemptions` esgotado é `limit_reached`", async () => {
    acha.mockResolvedValue(cupom({ maxRedemptions: 5, maxPerPatient: 99 }));
    conta.mockResolvedValueOnce(0).mockResolvedValueOnce(5);
    const r = await pedir();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("limit_reached");
  });

  it("sem `maxRedemptions`, o total nem é contado", async () => {
    await pedir();
    // Uma contagem só: a do paciente. Contar o total de uma campanha sem limite
    // é varrer a tabela para nada em cada tela de pagamento.
    expect(conta).toHaveBeenCalledTimes(1);
  });

  it("os dois limites contam o pago **e** quem está pagando agora", async () => {
    acha.mockResolvedValue(cupom({ maxRedemptions: 3 }));
    await pedir();
    for (const chamada of conta.mock.calls) {
      expect(chamada[0].where.OR).toEqual([
        { confirmedAt: { not: null } },
        { createdAt: { gte: expect.any(Date) } },
      ]);
    }
    // O da pessoa é escopado nela; o da campanha, não.
    expect(conta.mock.calls[0][0].where.patientId).toBe("p1");
    expect(conta.mock.calls[1][0].where.patientId).toBeUndefined();
  });

  it("**uma** reserva sai da conta — a que vai ser reaproveitada, e só ela", async () => {
    // Excluir "as reservas dele" em bloco abria o N-1: dois escopos, nenhum
    // contando, dois pagamentos num cupom de uso único. Uma linha entra, uma sai.
    acha.mockResolvedValue(cupom({ maxRedemptions: 3 }));
    await pedir({ ignorarResgateId: "r-antiga" });
    for (const chamada of conta.mock.calls) {
      expect(chamada[0].where.id).toEqual({ not: "r-antiga" });
      expect(chamada[0].where.NOT).toBeUndefined();
    }
  });

  it("sem reserva a reaproveitar, nada é excluído", async () => {
    acha.mockResolvedValue(cupom({ maxRedemptions: 3 }));
    await pedir();
    for (const chamada of conta.mock.calls) {
      expect(chamada[0].where.id).toBeUndefined();
    }
  });
});
