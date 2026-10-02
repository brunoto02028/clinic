/**
 * @jest-environment node
 *
 * A linha do tempo mostra o que saiu — e o que **não** saiu.
 *
 * Esta é a condição que o Bruno pôs em 17/09/2026 para voltar a confiar em
 * qualquer automação: *"nunca enviar nada a ninguem sem eu apertar o botao,
 * **pois nao sei onde fica registrado os envios**"*. A razão nunca foi medo
 * de mandar; era não ter onde conferir.
 *
 * O registro estava espalhado por cinco lugares — `PatientOutboundEmail`,
 * `OutboundMessage`, `AuditLog`, `SystemLog` e o log do `outbound-guard` —
 * e nenhum deles completo.
 *
 * O teste que importa aqui é o do **barrado**: uma tela que só mostra
 * sucesso esconde justamente o que se vem auditar.
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    auditLog: { findMany: jest.fn().mockResolvedValue([]) },
    exerciseCompletionLog: { findMany: jest.fn().mockResolvedValue([]) },
    clinicMessage: { findMany: jest.fn().mockResolvedValue([]) },
    medicalScreening: { findUnique: jest.fn().mockResolvedValue(null) },
    patientDocument: { findMany: jest.fn().mockResolvedValue([]) },
    dailyCheckIn: { findMany: jest.fn().mockResolvedValue([]) },
    patientOutboundEmail: { findMany: jest.fn().mockResolvedValue([]) },
    systemLog: { findMany: jest.fn().mockResolvedValue([]) },
    outboundMessage: { findMany: jest.fn().mockResolvedValue([]) },
  },
}));
jest.mock("@/lib/staff-patient-access", () => ({ staffPatientAccess: jest.fn() }));

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import { GET } from "@/app/api/admin/patients/[id]/activity/route";

const db = prisma as any;
const PACIENTE = "paciente-1";

const pedir = async () => {
  const res = await GET(
    new NextRequest(`http://localhost/api/admin/patients/${PACIENTE}/activity`) as any,
    { params: { id: PACIENTE } }
  );
  return (await res.json()).events as any[];
};

beforeEach(() => {
  jest.clearAllMocks();
  (staffPatientAccess as jest.Mock).mockResolvedValue({ response: null });
  for (const m of [
    "auditLog", "exerciseCompletionLog", "clinicMessage", "patientDocument",
    "dailyCheckIn", "patientOutboundEmail", "systemLog", "outboundMessage",
  ]) db[m].findMany.mockResolvedValue([]);
  db.medicalScreening.findUnique.mockResolvedValue(null);
});

describe("o que saiu", () => {
  it("mostra o e-mail enviado, com assunto e quem apertou", async () => {
    db.patientOutboundEmail.findMany.mockResolvedValue([
      {
        id: "e1", subject: "Your exercises", status: "sent", locale: "en-GB",
        bothLanguages: false, providerError: null, bodyText: "Hi Ana,",
        createdAt: new Date("2026-10-02T09:00:00Z"),
        sentBy: { firstName: "Bruno", lastName: "T" },
      },
    ]);

    const [ev] = await pedir();
    expect(ev.type).toBe("SEND_OUT");
    expect(ev.title).toContain("Your exercises");
    expect(ev.description).toContain("Bruno T");
    expect(ev.origin).toBe("clinic");
  });

  it("um envio que falhou não se disfarça de enviado", async () => {
    db.patientOutboundEmail.findMany.mockResolvedValue([
      {
        id: "e2", subject: "Invoice", status: "failed", locale: "en-GB",
        bothLanguages: false, providerError: "rate_limit_exceeded", bodyText: "",
        createdAt: new Date(), sentBy: null,
      },
    ]);

    const [ev] = await pedir();
    expect(ev.title).toContain("FAILED");
    expect(ev.description).toContain("rate_limit_exceeded");
  });
});

describe("o que NÃO saiu", () => {
  /** O cenário inteiro desta tarefa cabe neste teste. */
  it("mostra o que o portão barrou, com o motivo", async () => {
    db.systemLog.findMany.mockResolvedValue([
      {
        id: "s1",
        message: "barrado:nao-pedido",
        path: "POST /api/admin/exercise-prescriptions",
        details: { canal: "email", modo: "explicito" },
        createdAt: new Date(),
      },
    ]);

    const [ev] = await pedir();
    expect(ev.type).toBe("SEND_BLOCKED");
    expect(ev.title).toContain("Not sent");
    expect(ev.title).toContain("nao-pedido");
    expect(ev.description).toContain("exercise-prescriptions");
  });

  it("só lê as decisões do portão deste paciente", async () => {
    await pedir();
    const where = db.systemLog.findMany.mock.calls[0][0].where;
    expect(where.source).toBe("patient-send-gate");
    expect(where.userId).toBe(PACIENTE);
  });

  it("o que está na fila aparece como fila, não como enviado", async () => {
    db.outboundMessage.findMany.mockResolvedValue([
      { id: "o1", subjectEn: "WhatsApp to Ana", status: "AWAITING_APPROVAL", channel: "WHATSAPP", createdAt: new Date() },
    ]);

    const [ev] = await pedir();
    expect(ev.type).toBe("SEND_QUEUED");
    expect(ev.title).toContain("AWAITING_APPROVAL");
  });
});

describe("quem apertou o gatilho", () => {
  /**
   * Transacional é resposta ao que o paciente acabou de fazer — código de
   * acesso, confirmação de upload. Misturar isso com o que a clínica
   * disparou tornaria a tela inútil para auditar a clínica.
   */
  it("separa o transacional do que a clínica mandou", async () => {
    db.systemLog.findMany.mockResolvedValue([
      { id: "s1", message: "passou", path: "x", details: { canal: "email", modo: "transacional" }, createdAt: new Date() },
      { id: "s2", message: "passou", path: "y", details: { canal: "email", modo: "explicito" }, createdAt: new Date(Date.now() - 1000) },
    ]);

    const [doPaciente, daClinica] = await pedir();
    expect(doPaciente.origin).toBe("patient");
    expect(daClinica.origin).toBe("clinic");
  });
});

describe("não quebra o que já existia", () => {
  it("as fontes antigas continuam na mesma lista", async () => {
    db.auditLog.findMany.mockResolvedValue([
      { id: "a1", action: "LOGIN_SUCCESS", description: null, createdAt: new Date() },
    ]);
    db.patientOutboundEmail.findMany.mockResolvedValue([
      {
        id: "e1", subject: "oi", status: "sent", locale: "en-GB", bothLanguages: false,
        providerError: null, bodyText: "", createdAt: new Date(Date.now() - 5000), sentBy: null,
      },
    ]);

    const eventos = await pedir();
    expect(eventos.map((e) => e.type)).toEqual(["LOGIN", "SEND_OUT"]);
  });
});
