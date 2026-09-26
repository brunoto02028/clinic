/**
 * @jest-environment node
 *
 * A reserva é de **uma compra** (R-1 do reteste, 26/09/2026).
 *
 * Este arquivo existe porque meus mocks anteriores não davam para provar o que
 * precisava ser provado. Um `count` cravado não distingue *"reaproveitou a
 * reserva"* de *"criou a segunda"* — e foi por aí que dois defeitos passaram.
 *
 * Então aqui o Prisma é um **falso que guarda linhas** e aplica os mesmos
 * filtros da consulta real. Ele pode estar errado, mas erra de um jeito visível:
 * se o filtro que eu escrevi no falso não bate com o que o código pede, o teste
 * quebra.
 *
 * O defeito que ele guarda: com `maxPerPatient: 1`, o mesmo paciente abria duas
 * consultas pendentes, ganhava **duas** sessões de £80 e o banco registrava
 * **um** resgate. A chave do reaproveitamento era (cupom, paciente, escopo), e
 * duas consultas diferentes pareciam dois toques na mesma.
 */

const linhas: any[] = [];
let seq = 0;

/** Os filtros que `resolveCoupon` e `reservarCupom` usam, aplicados a sério. */
function casa(l: any, w: any): boolean {
  if (w.couponId && l.couponId !== w.couponId) return false;
  if (w.patientId !== undefined && l.patientId !== w.patientId) return false;
  if (w.scope !== undefined && l.scope !== w.scope) return false;
  if (w.targetId !== undefined && (l.targetId ?? null) !== w.targetId) return false;
  if (w.confirmedAt === null && l.confirmedAt !== null) return false;
  if (w.confirmedAt?.not === null && l.confirmedAt === null) return false;
  if (w.id?.not && l.id === w.id.not) return false;
  if (w.createdAt?.gte && l.createdAt < w.createdAt.gte) return false;
  if (w.coupon && l.couponId !== "c1") return false;
  if (w.OR) {
    const algum = w.OR.some((o: any) => {
      if (o.confirmedAt?.not === null) return l.confirmedAt !== null;
      if (o.createdAt?.gte) return l.createdAt >= o.createdAt.gte;
      return false;
    });
    if (!algum) return false;
  }
  return true;
}

let cupomAtual: any = null;

jest.mock("@/lib/db", () => ({
  prisma: {
    coupon: { findUnique: jest.fn(async () => cupomAtual) },
    couponRedemption: {
      count: jest.fn(async ({ where }: any) => linhas.filter((l) => casa(l, where)).length),
      findFirst: jest.fn(async ({ where }: any) => linhas.filter((l) => casa(l, where)).at(-1) ?? null),
      create: jest.fn(async ({ data }: any) => {
        const l = { id: `r${++seq}`, confirmedAt: null, stripeSessionId: null, createdAt: new Date(), ...data };
        linhas.push(l);
        return l;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const l = linhas.find((x) => x.id === where.id)!;
        Object.assign(l, data);
        return l;
      }),
      delete: jest.fn(async ({ where }: any) => {
        const i = linhas.findIndex((x) => x.id === where.id);
        if (i < 0) throw new Error("não existe");
        return linhas.splice(i, 1)[0];
      }),
      updateMany: jest.fn(async () => ({ count: 0 })),
      deleteMany: jest.fn(async () => ({ count: 0 })),
    },
  },
}));

import { reservarCupom } from "../../lib/coupon-redemption";

const cupom = (over: Record<string, unknown> = {}) => ({
  id: "c1", clinicId: "clinic-A", code: "VERAO10", description: "Verão",
  discountPercent: 20, discountAmount: null, currency: "GBP",
  appliesTo: ["CONSULTATION", "MEMBERSHIP"], patientId: null,
  startsAt: null, endsAt: null, maxRedemptions: null, maxPerPatient: 1,
  isActive: true, ...over,
});

const reservar = (over: Record<string, unknown> = {}) =>
  reservarCupom({
    clinicId: "clinic-A", patientId: "p1", code: "VERAO10",
    scope: "CONSULTATION", amount: 100, currency: "GBP", ...over,
  } as any);

beforeEach(() => {
  linhas.length = 0;
  seq = 0;
  cupomAtual = cupom();
  jest.clearAllMocks();
});

describe("dois toques na MESMA compra são um resgate", () => {
  it("a segunda chamada reaproveita a linha, não cria outra", async () => {
    const a = await reservar({ targetId: "consulta-1" });
    const b = await reservar({ targetId: "consulta-1" });
    expect(a.tipo).toBe("reservado");
    expect(b.tipo).toBe("reservado");
    expect(linhas).toHaveLength(1);
    if (a.tipo === "reservado" && b.tipo === "reservado") {
      expect(b.reserva.redemptionId).toBe(a.reserva.redemptionId);
    }
  });

  it("e a sessão anterior é expirada na Stripe — ela seguia pagável por 24h", async () => {
    const expire = jest.fn();
    const stripe = { checkout: { sessions: { expire } } };
    const a = await reservar({ targetId: "consulta-1", stripe });
    if (a.tipo === "reservado") {
      linhas[0].stripeSessionId = "cs_1"; // como se a rota tivesse anexado
    }
    await reservar({ targetId: "consulta-1", stripe });
    expect(expire).toHaveBeenCalledWith("cs_1");
  });

  it("expirar falhando não derruba a reserva nova", async () => {
    const stripe = { checkout: { sessions: { expire: jest.fn().mockRejectedValue(new Error("já paga")) } } };
    await reservar({ targetId: "consulta-1", stripe });
    linhas[0].stripeSessionId = "cs_1";
    const erro = jest.spyOn(console, "error").mockImplementation(() => {});
    const r = await reservar({ targetId: "consulta-1", stripe });
    expect(r.tipo).toBe("reservado");
    erro.mockRestore();
  });
});

describe("duas compras DIFERENTES são duas reservas — e o limite pega a segunda", () => {
  it("duas consultas pendentes com `maxPerPatient: 1`: a segunda é recusada", async () => {
    // Este é o R-1. Antes: dois 200, duas sessões de £80, um resgate no banco.
    const a = await reservar({ targetId: "consulta-1" });
    expect(a.tipo).toBe("reservado");
    const b = await reservar({ targetId: "consulta-2" });
    expect(b.tipo).toBe("recusado");
    if (b.tipo === "recusado") expect(b.recusa.reason).toBe("already_used");
    expect(linhas).toHaveLength(1);
  });

  it("e com folga no limite, as duas passam como duas linhas", async () => {
    cupomAtual = cupom({ maxPerPatient: 5 });
    await reservar({ targetId: "consulta-1" });
    await reservar({ targetId: "consulta-2" });
    expect(linhas).toHaveLength(2);
    expect(linhas.map((l) => l.targetId)).toEqual(["consulta-1", "consulta-2"]);
  });

  it("escopos diferentes seguem sendo duas compras (o N-1 continua fechado)", async () => {
    const a = await reservar({ scope: "CONSULTATION", targetId: "consulta-1" });
    expect(a.tipo).toBe("reservado");
    const b = await reservar({ scope: "MEMBERSHIP", targetId: "plano-1" });
    expect(b.tipo).toBe("recusado");
    expect(linhas).toHaveLength(1);
  });
});

describe("o limite da campanha continua valendo entre pessoas", () => {
  it("a reserva em andamento de um paciente bloqueia o outro", async () => {
    cupomAtual = cupom({ maxRedemptions: 1, maxPerPatient: 5 });
    const a = await reservar({ patientId: "p1", targetId: "consulta-1" });
    expect(a.tipo).toBe("reservado");
    const b = await reservar({ patientId: "p2", targetId: "consulta-2" });
    expect(b.tipo).toBe("recusado");
    if (b.tipo === "recusado") expect(b.recusa.reason).toBe("limit_reached");
  });

  it("e a reserva envelhecida além da janela libera a vaga", async () => {
    cupomAtual = cupom({ maxRedemptions: 1, maxPerPatient: 5 });
    await reservar({ patientId: "p1", targetId: "consulta-1" });
    // 25h atrás: fora da janela de 24h, e o Stripe já teria expirado a sessão.
    linhas[0].createdAt = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const b = await reservar({ patientId: "p2", targetId: "consulta-2" });
    expect(b.tipo).toBe("reservado");
  });

  it("um resgate **pago** bloqueia para sempre, não só por 24h", async () => {
    cupomAtual = cupom({ maxRedemptions: 1, maxPerPatient: 5 });
    await reservar({ patientId: "p1", targetId: "consulta-1" });
    linhas[0].confirmedAt = new Date();
    linhas[0].createdAt = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
    const b = await reservar({ patientId: "p2", targetId: "consulta-2" });
    expect(b.tipo).toBe("recusado");
    if (b.tipo === "recusado") expect(b.recusa.reason).toBe("limit_reached");
  });
});
