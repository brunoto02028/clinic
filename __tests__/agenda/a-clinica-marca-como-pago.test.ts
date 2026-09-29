/**
 * @jest-environment node
 *
 * A clínica marca como pago (106 T-6).
 *
 * O Bruno: *"quando um paciente que conhecemos liga na clinic e quer agendar
 * uma consulta, e a clini agenda uma consulta e ele paga com transferência na
 * conta, a clini coloca como pago e libera a consulta, tá? Essas variações são
 * importantes existirem, sempre com a clinic no comando e liberdade."*
 *
 * Liberar já dava: o botão *Confirm* existia. O que não dava era **registrar
 * que o dinheiro entrou** — então a consulta ficava confirmada sem nada nos
 * livros, e três meses depois ninguém sabia se foi paga, cortesia, ou
 * esquecida.
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    appointment: { findFirst: jest.fn(), update: jest.fn() },
    payment: { upsert: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock("@/lib/tenant-access", () => ({
  ...jest.requireActual("@/lib/tenant-access"),
  getActor: jest.fn(),
}));

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, type Actor } from "@/lib/tenant-access";
import { POST, DELETE } from "@/app/api/admin/appointments/[id]/payment/route";

const db = prisma as any;
const actorMock = getActor as jest.Mock;

const actor = (over: Partial<Actor> = {}): Actor => ({
  userId: "admin1", role: "ADMIN", clinicId: "clinicaA", isImpersonating: false, ...over,
});

const consulta = (over: any = {}) => ({
  id: "c1", status: "PENDING", price: 60, patientId: "p1", payment: null, ...over,
});

const post = (body: any, id = "c1") =>
  POST(
    new NextRequest("http://localhost/x", { method: "POST", body: JSON.stringify(body) }),
    { params: { id } }
  );

const del = (id = "c1") =>
  DELETE(new NextRequest("http://localhost/x", { method: "DELETE" }), { params: { id } });

beforeEach(() => {
  jest.resetAllMocks();
  db.$transaction.mockImplementation(async (ops: any[]) => ops.map(() => ({ amount: 60, status: "CONFIRMED" })));
  db.payment.upsert.mockResolvedValue({ amount: 60 });
});

describe("registrar e liberar são um ato só", () => {
  it("**cria o pagamento e confirma a consulta na mesma transação**", () => {
    // Dois botões em sequência viram um esquecido, e o esquecido aqui é o que
    // põe o dinheiro nos livros.
    actorMock.mockResolvedValue(actor());
    db.appointment.findFirst.mockResolvedValue(consulta());
    return post({ channel: "TRANSFER" }).then(() => {
      expect(db.$transaction).toHaveBeenCalledTimes(1);
      expect(db.payment.upsert).toHaveBeenCalled();
      expect(db.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: "CONFIRMED" } })
      );
    });
  });

  it("o pagamento guarda o canal, quem registrou e quando", async () => {
    // Dinheiro anotado à mão sem autor é discussão daqui a três meses.
    actorMock.mockResolvedValue(actor());
    db.appointment.findFirst.mockResolvedValue(consulta());
    await post({ channel: "CASH", note: "recebido na recepção" });
    const dados = db.payment.upsert.mock.calls[0][0].create;
    expect(dados.channel).toBe("CASH");
    expect(dados.status).toBe("SUCCEEDED");
    expect(dados.recordedById).toBe("admin1");
    expect(dados.recordedAt).toBeInstanceOf(Date);
    expect(dados.note).toBe("recebido na recepção");
  });

  it("o valor é o da consulta, e não o que o cliente mandar", async () => {
    // Aceitar um valor do corpo deixaria quem chama escolher quanto entrou.
    actorMock.mockResolvedValue(actor());
    db.appointment.findFirst.mockResolvedValue(consulta({ price: 85 }));
    await post({ channel: "TRANSFER", amount: 5 });
    expect(db.payment.upsert.mock.calls[0][0].create.amount).toBe(85);
  });

  it("**usa `upsert`**: uma Stripe pendente que nunca completou não vira segundo registro", async () => {
    actorMock.mockResolvedValue(actor());
    db.appointment.findFirst.mockResolvedValue(
      consulta({ payment: { id: "pay1", status: "PENDING" } })
    );
    await post({ channel: "TRANSFER" });
    expect(db.payment.upsert.mock.calls[0][0].where).toEqual({ appointmentId: "c1" });
  });
});

describe("o que não se pode marcar", () => {
  it.each([
    ["sem canal", {}],
    ["canal inventado", { channel: "PIX" }],
    ["a maquininha que a clínica não tem", { channel: "CARD_MACHINE" }],
    ["o canal do cartão", { channel: "STRIPE" }],
  ])("%s → 400", async (_nome, body) => {
    actorMock.mockResolvedValue(actor());
    expect((await post(body)).status).toBe(400);
    expect(db.appointment.findFirst).not.toHaveBeenCalled();
  });

  it("**consulta sem cobrança não recebe pagamento**", async () => {
    // Registrar £0,00 como recebido põe uma linha falsa no faturamento.
    actorMock.mockResolvedValue(actor());
    db.appointment.findFirst.mockResolvedValue(consulta({ price: 0 }));
    const res = await post({ channel: "CASH" });
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("nothing_to_pay");
  });

  it("consulta já paga responde 409, e não paga duas vezes", async () => {
    actorMock.mockResolvedValue(actor());
    db.appointment.findFirst.mockResolvedValue(
      consulta({ payment: { id: "pay1", status: "SUCCEEDED" } })
    );
    expect((await post({ channel: "CASH" })).status).toBe(409);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it.each(["CANCELLED", "NO_SHOW"])("consulta %s não recebe", async (status) => {
    actorMock.mockResolvedValue(actor());
    db.appointment.findFirst.mockResolvedValue(consulta({ status }));
    expect((await post({ channel: "CASH" })).status).toBe(409);
  });
});

describe("quem pode marcar", () => {
  it("**terapeuta não** — receber dinheiro não é ação dele", async () => {
    actorMock.mockResolvedValue(actor({ role: "THERAPIST" }));
    expect((await post({ channel: "CASH" })).status).toBe(403);
    expect(db.appointment.findFirst).not.toHaveBeenCalled();
  });

  it("paciente muito menos", async () => {
    actorMock.mockResolvedValue(actor({ role: "PATIENT" }));
    expect((await post({ channel: "CASH" })).status).toBe(403);
  });

  it("sem sessão, 401", async () => {
    actorMock.mockResolvedValue(null);
    expect((await post({ channel: "CASH" })).status).toBe(401);
  });

  it("**a parede da clínica vale aqui também**", async () => {
    actorMock.mockResolvedValue(actor());
    db.appointment.findFirst.mockResolvedValue(consulta());
    await post({ channel: "CASH" });
    expect(db.appointment.findFirst.mock.calls[0][0].where).toEqual({
      id: "c1",
      clinicId: "clinicaA",
    });
  });

  it("consulta de outra clínica é 404, e não 403", async () => {
    actorMock.mockResolvedValue(actor());
    db.appointment.findFirst.mockResolvedValue(null);
    expect((await post({ channel: "CASH" })).status).toBe(404);
  });
});

describe("desfazer", () => {
  it("**o pagamento volta a falho, e não some**", async () => {
    // Apagar a linha apagaria o registro de quem a criou. O que se desfaz é o
    // valor, não a história.
    actorMock.mockResolvedValue(actor());
    db.appointment.findFirst.mockResolvedValue({
      id: "c1", payment: { id: "pay1", channel: "TRANSFER" },
    });
    await del();
    expect(db.payment.update.mock.calls[0][0].data.status).toBe("FAILED");
    expect(db.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "PENDING" } })
    );
  });

  it("**pagamento de cartão não se desfaz por aqui** — isso é reembolso", async () => {
    actorMock.mockResolvedValue(actor());
    db.appointment.findFirst.mockResolvedValue({
      id: "c1", payment: { id: "pay1", channel: "STRIPE" },
    });
    const res = await del();
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("stripe_payment");
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("consulta sem pagamento nenhum é 404", async () => {
    actorMock.mockResolvedValue(actor());
    db.appointment.findFirst.mockResolvedValue({ id: "c1", payment: null });
    expect((await del()).status).toBe(404);
  });

  it("terapeuta não desfaz", async () => {
    actorMock.mockResolvedValue(actor({ role: "THERAPIST" }));
    expect((await del()).status).toBe(403);
  });
});
