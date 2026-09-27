/**
 * @jest-environment node
 *
 * O desfazer do recado, **medido pelo comportamento**.
 *
 * O caso central é a corrida, e ele **reprovava na versão de ontem**: o código
 * lia `readAt`, apagava o documento, e só então tentava o `deleteMany`
 * condicional. Se o terapeuta abrisse a conversa nesse intervalo, o resultado
 * era o pior de todos — a mensagem continuava na conversa, o app dizia ao
 * paciente *"a clínica já viu esta mensagem"*, e o áudio tinha sumido para
 * sempre.
 *
 * Era exatamente o desfecho que o comentário daquele arquivo afirmava impedir.
 * Achado do code review de 27/09/2026.
 */

jest.mock("@/lib/db", () => {
  const clinicMessage = { findFirst: jest.fn(), deleteMany: jest.fn() };
  const patientDocument = { deleteMany: jest.fn() };
  return {
    prisma: {
      clinicMessage,
      patientDocument,
      // A transação roda o corpo com o mesmo par de modelos, e deixa a exceção
      // subir — que é como o Prisma desfaz o que já foi feito.
      $transaction: jest.fn(async (fn: any) => fn({ clinicMessage, patientDocument })),
    },
  };
});

import { prisma } from "@/lib/db";
import { apagarRecadoDoPaciente, docIdDoAnexo } from "@/lib/apagar-recado";

const msg = (prisma as any).clinicMessage;
const doc = (prisma as any).patientDocument;

const RECADO = {
  id: "m1",
  readAt: null,
  attachmentUrl: "/api/files/doc-1",
};

beforeEach(() => {
  jest.clearAllMocks();
  msg.findFirst.mockResolvedValue({ ...RECADO });
  msg.deleteMany.mockResolvedValue({ count: 1 });
  doc.deleteMany.mockResolvedValue({ count: 1 });
});

describe("o caminho feliz leva os dois", () => {
  it("apaga a mensagem e o documento do áudio", async () => {
    const r = await apagarRecadoDoPaciente({ messageId: "m1", patientId: "p1" });

    expect(r).toEqual({ ok: true, documentoApagado: true });
    expect(msg.deleteMany).toHaveBeenCalledTimes(1);
    expect(doc.deleteMany).toHaveBeenCalledWith({ where: { id: "doc-1", patientId: "p1" } });
  });

  it("**e a mensagem sai antes do documento**", async () => {
    // É esta ordem que faz a corrida ser segura: o que pode falhar vai primeiro,
    // e nada é destruído antes de ela ser ganha.
    const ordem: string[] = [];
    msg.deleteMany.mockImplementation(async () => {
      ordem.push("mensagem");
      return { count: 1 };
    });
    doc.deleteMany.mockImplementation(async () => {
      ordem.push("documento");
      return { count: 1 };
    });

    await apagarRecadoDoPaciente({ messageId: "m1", patientId: "p1" });
    expect(ordem).toEqual(["mensagem", "documento"]);
  });

  it("e a condição de dono e de não-lida viaja junto no delete", async () => {
    // Repetida no `deleteMany` de propósito: entre a leitura e agora, o
    // terapeuta pode ter aberto a conversa.
    await apagarRecadoDoPaciente({ messageId: "m1", patientId: "p1" });
    expect(msg.deleteMany).toHaveBeenCalledWith({
      where: { id: "m1", patientId: "p1", senderId: "p1", senderRole: "patient", readAt: null },
    });
  });
});

describe("**a corrida: o terapeuta abre a conversa no mesmo segundo**", () => {
  it("não destrói o áudio, e diz que já foi vista", async () => {
    // A leitura vê `readAt` nulo; o `deleteMany` casa zero porque alguém leu no
    // meio. Este é o caso que reprovava antes.
    msg.deleteMany.mockResolvedValue({ count: 0 });

    const r = await apagarRecadoDoPaciente({ messageId: "m1", patientId: "p1" });

    expect(r).toEqual({ ok: false, code: "already_read" });
    // **O documento não pode ter sido tocado.** Era aqui que o áudio sumia
    // enquanto a mensagem ficava na conversa.
    expect(doc.deleteMany).not.toHaveBeenCalled();
  });
});

describe("quem não pode, não apaga", () => {
  it("recado que não é dele responde 'não existe'", async () => {
    msg.findFirst.mockResolvedValue(null);
    const r = await apagarRecadoDoPaciente({ messageId: "m1", patientId: "p1" });
    expect(r).toEqual({ ok: false, code: "not_found" });
    expect(msg.deleteMany).not.toHaveBeenCalled();
  });

  it("e recado já lido nem chega ao delete", async () => {
    msg.findFirst.mockResolvedValue({ ...RECADO, readAt: new Date() });
    const r = await apagarRecadoDoPaciente({ messageId: "m1", patientId: "p1" });
    expect(r).toEqual({ ok: false, code: "already_read" });
    expect(msg.deleteMany).not.toHaveBeenCalled();
    expect(doc.deleteMany).not.toHaveBeenCalled();
  });

  it("a busca amarra conversa, remetente e papel", async () => {
    await apagarRecadoDoPaciente({ messageId: "m1", patientId: "p1" });
    expect(msg.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "m1", patientId: "p1", senderId: "p1", senderRole: "patient" },
      })
    );
  });
});

describe("recado sem anexo, e anexo que já sumiu", () => {
  it("recado de texto apaga só a mensagem", async () => {
    msg.findFirst.mockResolvedValue({ ...RECADO, attachmentUrl: null });
    const r = await apagarRecadoDoPaciente({ messageId: "m1", patientId: "p1" });
    expect(r).toEqual({ ok: true, documentoApagado: false });
    expect(doc.deleteMany).not.toHaveBeenCalled();
  });

  it("**documento que já não existe não derruba o apagar**", async () => {
    // `deleteMany` e não `delete`: com `delete`, uma linha ausente lançaria e a
    // transação desfaria a exclusão da mensagem — o paciente apertaria de novo
    // para sempre.
    doc.deleteMany.mockResolvedValue({ count: 0 });
    const r = await apagarRecadoDoPaciente({ messageId: "m1", patientId: "p1" });
    expect(r).toEqual({ ok: true, documentoApagado: false });
  });
});

describe("o id do documento sai do anexo", () => {
  it("e ignora o que não for do nosso formato", () => {
    expect(docIdDoAnexo("/api/files/abc?t=x")).toBe("abc");
    expect(docIdDoAnexo("/api/outra/abc")).toBeNull();
    expect(docIdDoAnexo(null)).toBeNull();
  });
});
