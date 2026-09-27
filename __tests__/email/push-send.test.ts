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

// `userId` entrou com a 092 T-8: é por ele que o envio sabe se aquele aparelho
// está recebendo por conta própria ou por conta de quem a pessoa cuida.
const tokensDe = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `d${i}`, token: `ExponentPushToken[t${i}]`, userId: "u1" }));

const okPara = (n: number) => ({
  ok: true,
  json: async () => ({ data: Array.from({ length: n }, () => ({ status: "ok" })) }),
});

beforeEach(() => {
  jest.clearAllMocks();
  (outboundAllowed as jest.Mock).mockReturnValue(true);
  // Serve as duas consultas: a de `pedidos` (que lê `managedById`) e a do
  // portão (`pushEnabled`). Um paciente comum é destinatário de si mesmo.
  users.findMany.mockResolvedValue([{ id: "u1", firstName: "Paciente", managedById: null }]);
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
    /**
     * Dois `Once`, e isso é o ponto: "a pessoa não existe" e "a pessoa desligou
     * o aviso" passaram a ser estados **diferentes** (092 T-8).
     *
     * Antes havia uma consulta só, e um `[]` nela significava as duas coisas.
     * Agora a primeira responde quem é a pessoa (e por conta de quem ela
     * recebe), e a segunda é o portão do `pushEnabled`. O mock com um `[]`
     * único virou "usuário inexistente", que sai antes do portão — e foi assim
     * que este teste reprovou, medindo um cenário que não era o do título.
     */
    users.findMany
      .mockResolvedValueOnce([{ id: "u1", firstName: "Paciente", managedById: null }])
      .mockResolvedValueOnce([]); // ...e ela desligou o aviso

    const r = await sendPushToUsers(["u1"], { title: "t", body: "b" });

    expect(r).toEqual({ sent: 0, failed: 0, deactivated: 0 });
    expect(global.fetch).not.toHaveBeenCalled();
    /**
     * A regra de silêncio é aplicada aqui, e não em cada chamador — **e em
     * SQL**, não num filtro de JavaScript, que é mais fácil de furar sem
     * perceber.
     *
     * A asserção era `calls[0][0].where.pushEnabled` e reprovou quando a 092 T-8
     * acrescentou uma consulta antes desta, para achar quem responde por quem é
     * gerido. Estava medindo a **ordem das consultas**, que não é a garantia;
     * a garantia é que o portão exista em alguma delas.
     */
    const comPortao = users.findMany.mock.calls.filter(
      (c: any[]) => c[0]?.where?.pushEnabled === true
    );
    expect(comPortao).toHaveLength(1);
  });

  /**
   * Quem é gerido não tem aparelho: o aviso dela é de quem responde por ela
   * (092 T-8).
   *
   * Dois `mockResolvedValueOnce` em sequência porque o caminho faz duas
   * consultas de propósito: a primeira descobre que `u1` é gerida pela `mae`, a
   * segunda confere o `pushEnabled` **da mãe** — se ela desligou os avisos, o da
   * filha também se cala, senão a criança seria um jeito de furar o silêncio que
   * a mãe pediu.
   */
  it("**o aviso de quem é gerido vai para quem responde, com o nome dela**", async () => {
    users.findMany
      .mockResolvedValueOnce([{ id: "u1", firstName: "Ana", managedById: "mae" }])
      .mockResolvedValueOnce([{ id: "mae" }]);
    devices.findMany.mockResolvedValue([
      { id: "d0", token: "ExponentPushToken[t0]", userId: "mae" },
    ]);

    const r = await sendPushToUsers(["u1"], { title: "Consulta", body: "sua sessão é amanhã às 15h" });

    expect(r.sent).toBe(1);
    const corpo = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    // Sem o nome, a mãe leria "sua sessão é amanhã às 15h" e iria ela mesma.
    expect(corpo[0].body).toBe("Ana: sua sessão é amanhã às 15h");
    expect(corpo[0].data.porContaDe).toBe("Ana");
    // O aparelho consultado é o da mãe, não o da filha, que não existe.
    expect(devices.findMany.mock.calls[0][0].where.userId.in).toEqual(["mae"]);
  });

  it("e o nome **não** entra quando o aviso é sobre quem recebe", async () => {
    // Um comunicado geral chega à mãe como recado da clínica, uma vez, sem
    // prefixo — e não como se fosse sobre a filha.
    users.findMany
      .mockResolvedValueOnce([
        { id: "mae", firstName: "Maria", managedById: null },
        { id: "u1", firstName: "Ana", managedById: "mae" },
      ])
      .mockResolvedValueOnce([{ id: "mae" }]);
    devices.findMany.mockResolvedValue([
      { id: "d0", token: "ExponentPushToken[t0]", userId: "mae" },
    ]);

    const r = await sendPushToUsers(["mae", "u1"], { title: "Aviso", body: "a clínica abre mais tarde" });

    // Um telefone, uma mensagem — não duas.
    expect(r.sent).toBe(1);
    const corpo = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(corpo).toHaveLength(1);
    expect(corpo[0].body).toBe("a clínica abre mais tarde");
    expect(corpo[0].data.porContaDe).toBeUndefined();
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
