/**
 * @jest-environment node
 *
 * Quanto a pessoa paga com o cupom (084, T-1).
 *
 * A conta é feita **uma** vez, aqui, e quem cobra usa o `final`. Dois
 * arredondamentos em lugares diferentes são a tela mostrando £79,99 e o cartão
 * sendo debitado em £80,00 — e a tela prometendo um número enquanto o servidor
 * cobra outro já custou uma rodada de QA na 080.
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    coupon: { findUnique: jest.fn() },
    couponRedemption: { count: jest.fn() },
  },
}));

import { prisma } from "@/lib/db";
import { applyCoupon, validateCouponInput } from "../../lib/coupon";

const acha = (prisma as any).coupon.findUnique as jest.Mock;
const conta = (prisma as any).couponRedemption.count as jest.Mock;

const cupom = (over: Record<string, unknown> = {}) => ({
  id: "c1", clinicId: "clinic-A", code: "VERAO10", description: "Verão",
  discountPercent: 10, discountAmount: null, currency: "GBP",
  appliesTo: ["CONSULTATION"], patientId: null, startsAt: null, endsAt: null,
  maxRedemptions: null, maxPerPatient: 1, isActive: true, ...over,
});

const aplicar = (amount: number, over: Record<string, unknown> = {}) =>
  applyCoupon({
    clinicId: "clinic-A", patientId: "p1", code: "VERAO10",
    scope: "CONSULTATION", amount, ...over,
  } as any);

beforeEach(() => {
  jest.clearAllMocks();
  acha.mockResolvedValue(cupom());
  conta.mockResolvedValue(0);
});

describe("a conta", () => {
  it("20% sobre £100", async () => {
    acha.mockResolvedValue(cupom({ discountPercent: 20 }));
    const r = await aplicar(100);
    expect(r).toMatchObject({ ok: true, original: 100, discount: 20, final: 80 });
  });

  it("valor fixo de £15 sobre £100", async () => {
    acha.mockResolvedValue(cupom({ discountPercent: null, discountAmount: 15 }));
    const r = await aplicar(100);
    expect(r).toMatchObject({ discount: 15, final: 85 });
  });

  it("100% zera, e é válido — cortesia com código", async () => {
    acha.mockResolvedValue(cupom({ discountPercent: 100 }));
    const r = await aplicar(100);
    expect(r).toMatchObject({ ok: true, discount: 100, final: 0 });
  });

  it("o desconto nunca passa do valor: £30 fixos sobre £20 zeram, não devolvem £10", async () => {
    acha.mockResolvedValue(cupom({ discountPercent: null, discountAmount: 30 }));
    const r = await aplicar(20);
    expect(r).toMatchObject({ discount: 20, final: 0 });
    if (r.ok) expect(r.final).toBeGreaterThanOrEqual(0);
  });

  it("arredonda a centavos uma única vez: 15% sobre £33,33", async () => {
    acha.mockResolvedValue(cupom({ discountPercent: 15 }));
    const r = await aplicar(33.33);
    // 4,9995 → 5,00, e o final fecha exatamente com o original menos o desconto.
    expect(r).toMatchObject({ discount: 5, final: 28.33 });
    if (r.ok) expect(Math.round((r.discount + r.final) * 100) / 100).toBe(33.33);
  });

  it("o cupom recusado não vira desconto zero — vira recusa", async () => {
    acha.mockResolvedValue(null);
    const r = await aplicar(100);
    expect(r.ok).toBe(false);
  });

  it("valor inválido tem motivo próprio — não vira 'não vale para esta compra'", async () => {
    // Era `wrong_scope`, então o paciente lia que o **código** não servia
    // quando o código estava certo e o valor estava errado: a forma exata da
    // F2 da 082 (achado F1 do QA da T-1).
    for (const v of [-10, Number.NaN]) {
      const r = await aplicar(v);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("invalid_amount");
    }
  });

  it("cupom de valor fixo em outra moeda é recusado, não convertido", async () => {
    acha.mockResolvedValue(cupom({ discountPercent: null, discountAmount: 15, currency: "GBP" }));
    const r = await aplicar(100, { currency: "EUR" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("wrong_currency");
  });

  it("cupom percentual não olha moeda — 20% de qualquer coisa são 20% daquela coisa", async () => {
    acha.mockResolvedValue(cupom({ discountPercent: 20 }));
    const r = await aplicar(100, { currency: "EUR" });
    expect(r).toMatchObject({ ok: true, discount: 20, final: 80 });
  });

  it("valor zero é uma conta válida, não um erro", async () => {
    const r = await aplicar(0);
    expect(r).toMatchObject({ ok: true, discount: 0, final: 0 });
  });
});

describe("o exame de laboratório não é alcançável", () => {
  it("`LAB_TEST` não é um escopo que o cupom conheça", () => {
    const erro = validateCouponInput({
      code: "EXAME20", discountPercent: 20, appliesTo: ["LAB_TEST"],
    });
    expect(erro).not.toBeNull();
  });

  it("nem misturado com um escopo válido", () => {
    const erro = validateCouponInput({
      code: "EXAME20", discountPercent: 20, appliesTo: ["CONSULTATION", "LAB_TEST"],
    });
    expect(erro).not.toBeNull();
  });
});

describe("validateCouponInput", () => {
  const ok = { code: "VERAO10", discountPercent: 10, appliesTo: ["CONSULTATION"] };

  it("aceita um cupom bem formado", () => {
    expect(validateCouponInput(ok)).toBeNull();
  });

  it("código curto demais para ser digitado", () => {
    expect(validateCouponInput({ ...ok, code: "AB" })).not.toBeNull();
  });

  it("código com espaço ou acento — o paciente digita à mão", () => {
    expect(validateCouponInput({ ...ok, code: "VERÃO 10" })).not.toBeNull();
  });

  it("percentual e valor fixo juntos", () => {
    expect(validateCouponInput({ ...ok, discountAmount: 5 })).not.toBeNull();
  });

  it("nenhum dos dois", () => {
    expect(validateCouponInput({ code: "X1234", appliesTo: ["CONSULTATION"] })).not.toBeNull();
  });

  it("percentual acima de 100 não é desconto", () => {
    expect(validateCouponInput({ ...ok, discountPercent: 120 })).not.toBeNull();
  });

  it("100% passa", () => {
    expect(validateCouponInput({ ...ok, discountPercent: 100 })).toBeNull();
  });

  it("sem alcance nenhum não vale para nada", () => {
    expect(validateCouponInput({ ...ok, appliesTo: [] })).not.toBeNull();
  });

  it("fim antes do início", () => {
    expect(
      validateCouponInput({ ...ok, startsAt: "2026-10-01", endsAt: "2026-09-01" })
    ).not.toBeNull();
  });

  it("limite por paciente menor que um", () => {
    expect(validateCouponInput({ ...ok, maxPerPatient: 0 })).not.toBeNull();
  });

  it("toda mensagem de erro vem nas duas línguas", () => {
    const erro = validateCouponInput({ ...ok, code: "AB" });
    expect(erro?.en).toMatch(/\w/);
    expect(erro?.pt).toMatch(/\w/);
    expect(erro?.pt).not.toBe(erro?.en);
  });
});
