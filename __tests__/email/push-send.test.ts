/**
 * @jest-environment node
 *
 * O envio de notificação para o celular.
 *
 * Quatro garantias que não podem se perder: quem desligou não recebe, 250
 * aparelhos não viram 250 chamadas, aparelho morto sai da lista sozinho, e o
 * serviço fora do ar não derruba quem chamou — a consulta foi remarcada de
 * verdade, e a notificação é o aviso, não o fato.
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    user: { findMany: jest.fn() },
    pushDeviceToken: { findMany: jest.fn(), updateMany: jest.fn() },
  },
}));
jest.mock("@/lib/outbound-guard", () => ({
  outboundAllowed: jest.fn(() => true),
  logSunk: jest.fn(),
}));

import { prisma } from "@/lib/db";
import { outboundAllowed } from "@/lib/outbound-guard";
import { sendPushToUsers, countPushDevices, isExpoPushToken } from "@/lib/push-send";

const users = (prisma as any).user;
const devices = (prisma as any).pushDeviceToken;

const tokensDe = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `d${i}`, token: `ExponentPushToken[t${i}]` }));

const okPara = (n: number) => ({
  ok: true,
  json: async () => ({ data: Array.from({ length: n }, () => ({ status: "ok" })) }),
});

beforeEach(() => {
  jest.clearAllMocks();
  (outboundAllowed as jest.Mock).mockReturnValue(true);
  users.findMany.mockResolvedValue([{ id: "u1" }]);
  devices.findMany.mockResolvedValue(tokensDe(1));
  devices.updateMany.mockResolvedValue({ count: 0 });
  global.fetch = jest.fn(async () => okPara(1)) as any;
});

describe("isExpoPushToken", () => {
  it("aceita o formato da Expo e recusa o resto", () => {
    expect(isExpoPushToken("ExponentPushToken[abc123]")).toBe(true);
    expect(isExpoPushToken("ExpoPushToken[abc123]")).toBe(true);
    expect(isExpoPushToken("fcm-token-qualquer")).toBe(false);
    expect(isExpoPushToken("")).toBe(false);
    expect(isExpoPushToken("ExponentPushToken[]")).toBe(false);
  });
});

describe("sendPushToUsers", () => {
  it("não manda para quem desligou o aviso", async () => {
    users.findMany.mockResolvedValue([]); // ninguém com pushEnabled: true

    const r = await sendPushToUsers(["u1"], { title: "t", body: "b" });

    expect(r).toEqual({ sent: 0, failed: 0, deactivated: 0 });
    expect(global.fetch).not.toHaveBeenCalled();
    // A regra de silêncio é aplicada aqui, e não em cada chamador
    expect(users.findMany.mock.calls[0][0].where.pushEnabled).toBe(true);
  });

  it("250 aparelhos viram 3 chamadas, não 250", async () => {
    devices.findMany.mockResolvedValue(tokensDe(250));
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(okPara(100))
      .mockResolvedValueOnce(okPara(100))
      .mockResolvedValueOnce(okPara(50));

    const r = await sendPushToUsers(["u1"], { title: "t", body: "b" });

    expect((global.fetch as jest.Mock).mock.calls).toHaveLength(3);
    expect(r.sent).toBe(250);
  });

  it("desativa o aparelho que não existe mais", async () => {
    devices.findMany.mockResolvedValue(tokensDe(2));
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ status: "ok" }, { status: "error", details: { error: "DeviceNotRegistered" } }],
      }),
    });

    const r = await sendPushToUsers(["u1"], { title: "t", body: "b" });

    expect(r.sent).toBe(1);
    expect(r.failed).toBe(1);
    expect(r.deactivated).toBe(1);
    expect(devices.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["d1"] } },
      data: { active: false },
    });
  });

  it("serviço fora do ar não estoura — devolve a falha", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("ECONNREFUSED"));

    const r = await sendPushToUsers(["u1"], { title: "t", body: "b" });

    expect(r.sent).toBe(0);
    expect(r.failed).toBe(1);
    expect(r.error).toContain("ECONNREFUSED");
  });

  it("token que não é da Expo nunca chega ao serviço", async () => {
    devices.findMany.mockResolvedValue([{ id: "d0", token: "fcm-antigo" }]);

    const r = await sendPushToUsers(["u1"], { title: "t", body: "b" });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(r.sent).toBe(0);
  });

  it("com o portão de saída fechado (QA), nada sai — e o resultado não mente", async () => {
    (outboundAllowed as jest.Mock).mockReturnValue(false);

    const r = await sendPushToUsers(["u1"], { title: "t", body: "b" });

    expect(global.fetch).not.toHaveBeenCalled();
    // Devolvia `sent: <número de aparelhos>` sem ter enviado nada, e o painel
    // dizia "3 devices" com zero chamadas de rede.
    expect(r.sent).toBe(0);
    expect(r.error).toBe("outbound_blocked");
  });

  it("o portão recebe a lista, não a string juntada", async () => {
    await sendPushToUsers(["u1", "u2"], { title: "t", body: "b" });
    expect(outboundAllowed).toHaveBeenCalledWith(["u1", "u2"]);
  });

  it("lista vazia não vira chamada", async () => {
    const r = await sendPushToUsers([], { title: "t", body: "b" });
    expect(r.sent).toBe(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("countPushDevices", () => {
  it("conta o que a prévia promete: aparelhos, não pacientes", async () => {
    users.findMany.mockResolvedValue([{ id: "u1" }, { id: "u2" }]);
    devices.findMany.mockResolvedValue(tokensDe(3));

    expect(await countPushDevices(["u1", "u2", "u3"])).toBe(3);
  });
});
