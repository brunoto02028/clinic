/**
 * @jest-environment node
 *
 * O chat do Command Center não manda. Ele enfileira.
 *
 * Era o pior achado da varredura de 02/10/2026 (atividade 104), por duas
 * coisas somadas: o texto saía escrito pela IA, sem ninguém ler, e o
 * destinatário era resolvido por `findFirst` com `contains` do nome. Pedir
 * *"manda um WhatsApp para a Ana"* pegava a **primeira** Ana do banco.
 *
 * Não é só mandar sem confirmar — é poder acertar outra pessoa. E a
 * interface disso é um chat: quem conversa com um assistente não espera que
 * a frase vire mensagem no telefone de uma paciente.
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    user: { findFirst: jest.fn(), findMany: jest.fn() },
  },
}));
jest.mock("@/lib/automation/outbox", () => ({ enqueueMessage: jest.fn() }));
jest.mock("@/lib/whatsapp", () => ({ sendAIWhatsAppMessage: jest.fn() }));
jest.mock("@/lib/email", () => ({ sendEmail: jest.fn() }));
jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth-options", () => ({ authOptions: {} }));
jest.mock("@/lib/ai-provider", () => ({ callAI: jest.fn(), generateImage: jest.fn() }));

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { enqueueMessage } from "@/lib/automation/outbox";
import { sendAIWhatsAppMessage } from "@/lib/whatsapp";
import { sendEmail } from "@/lib/email";
import { POST } from "@/app/api/admin/command-chat/actions/route";

const db = prisma as any;
const CLINICA = "clinica-bpr";

const chamar = (type: string, params: any) =>
  POST(
    new NextRequest("http://localhost/api/admin/command-chat/actions", {
      method: "POST",
      body: JSON.stringify({ type, params }),
    }) as any
  );

beforeEach(() => {
  jest.clearAllMocks();
  (getServerSession as jest.Mock).mockResolvedValue({
    user: { id: "staff-1", role: "ADMIN", clinicId: CLINICA, email: "admin@bpr.clinic" },
  });
  (enqueueMessage as jest.Mock).mockResolvedValue({ queued: true, messageId: "fila-1" });
});

describe("WhatsApp pelo chat", () => {
  it("não manda: enfileira", async () => {
    db.user.findMany.mockResolvedValue([
      { id: "p1", phone: "+44700900001", firstName: "Ana", lastName: "Prata" },
    ]);

    const res = await chamar("send_whatsapp", { patientName: "Ana", message: "oi" });
    const body = await res.json();

    expect(sendAIWhatsAppMessage).not.toHaveBeenCalled();
    expect(enqueueMessage).toHaveBeenCalledTimes(1);
    expect(body.queued).toBe(true);
  });

  /** O defeito original: `findFirst` escolhia a primeira e mandava. */
  it("nome ambíguo devolve os candidatos, e não escolhe nenhum", async () => {
    db.user.findMany.mockResolvedValue([
      { id: "p1", phone: "+4470090001", firstName: "Ana", lastName: "Prata" },
      { id: "p2", phone: "+4470090002", firstName: "Ana", lastName: "Souza" },
    ]);

    const res = await chamar("send_whatsapp", { patientName: "Ana", message: "oi" });
    const body = await res.json();

    expect(enqueueMessage).not.toHaveBeenCalled();
    expect(sendAIWhatsAppMessage).not.toHaveBeenCalled();
    expect(body.needsChoice).toBe(true);
    expect(body.candidates).toHaveLength(2);
  });

  it("telefone solto, sem paciente, não enfileira contra ninguém", async () => {
    const res = await chamar("send_whatsapp", { to: "+447700900000", message: "oi" });
    expect(res.status).toBe(400);
    expect(enqueueMessage).not.toHaveBeenCalled();
    expect(sendAIWhatsAppMessage).not.toHaveBeenCalled();
  });

  it("não atravessa inquilino: só procura paciente da clínica da sessão", async () => {
    db.user.findMany.mockResolvedValue([]);
    await chamar("send_whatsapp", { patientName: "Ana", message: "oi" });
    expect(db.user.findMany.mock.calls[0][0].where.clinicId).toBe(CLINICA);
  });

  it("mensagem vazia não vira linha na fila", async () => {
    db.user.findMany.mockResolvedValue([
      { id: "p1", phone: "+4470090001", firstName: "Ana", lastName: "Prata" },
    ]);
    const res = await chamar("send_whatsapp", { patientName: "Ana", message: "   " });
    expect(res.status).toBe(400);
    expect(enqueueMessage).not.toHaveBeenCalled();
  });
});

describe("e-mail pelo chat", () => {
  it("para um paciente: enfileira, não manda", async () => {
    db.user.findFirst.mockResolvedValue({ id: "p1", firstName: "Ana", lastName: "Prata" });

    const res = await chamar("send_email", {
      to: "ana@exemplo.com",
      subject: "oi",
      body: "texto",
    });
    const body = await res.json();

    expect(sendEmail).not.toHaveBeenCalled();
    expect(enqueueMessage).toHaveBeenCalledTimes(1);
    expect(body.queued).toBe(true);
  });

  /**
   * A separação é pelo destinatário, não pela intenção: escrever a um
   * fornecedor continua sendo escrever a um fornecedor.
   */
  it("para quem não é paciente: continua mandando", async () => {
    db.user.findFirst.mockResolvedValue(null);

    await chamar("send_email", {
      to: "fornecedor@exemplo.com",
      subject: "pedido",
      body: "texto",
    });

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(enqueueMessage).not.toHaveBeenCalled();
  });

  it("procura o paciente dentro da clínica da sessão", async () => {
    db.user.findFirst.mockResolvedValue(null);
    await chamar("send_email", { to: "x@y.com", subject: "a", body: "b" });
    expect(db.user.findFirst.mock.calls[0][0].where.clinicId).toBe(CLINICA);
  });
});
