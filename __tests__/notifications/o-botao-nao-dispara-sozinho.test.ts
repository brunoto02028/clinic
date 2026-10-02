/**
 * @jest-environment node
 *
 * Os botões do painel não falam com o paciente sozinhos.
 *
 * Varredura de 02/10/2026 (atividade 104). O caso que começou tudo:
 * prescrever exercícios mandava `EXERCISES_PRESCRIBED` sempre, e repor oito
 * exercícios na ficha de uma paciente exigiu **escrever direto no banco**
 * para não disparar nada.
 *
 * Os outros dois aqui mandavam **por omissão**: o aviso em massa nascia com
 * a caixa marcada, e um botão rotulado "simular e-mail" escrevia para a
 * caixa de entrada do paciente de verdade quando recebia um `patientId`.
 */

jest.mock("@/lib/db", () => {
  // Montado dentro da fábrica porque `jest.mock` é içado acima de qualquer
  // `const` do arquivo — e o `$transaction` precisa referenciar o próprio
  // objeto, já que o route escreve as prescrições dentro de uma.
  const p: any = {
    user: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
    exercise: { findMany: jest.fn() },
    exerciseFolder: { findFirst: jest.fn(), findMany: jest.fn() },
    exercisePrescription: { findMany: jest.fn(), create: jest.fn(), createMany: jest.fn(), updateMany: jest.fn() },
    patientOutboundEmail: { count: jest.fn() },
    systemLog: { count: jest.fn(), create: jest.fn() },
  };
  p.$transaction = (ops: any) => (typeof ops === "function" ? ops(p) : Promise.all(ops));
  return { prisma: p };
});
jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth-options", () => ({ authOptions: {} }));
jest.mock("@/lib/notify-patient", () => ({
  ...jest.requireActual("@/lib/notify-patient"),
  notifyPatient: jest.fn(),
}));
jest.mock("@/lib/system-logger", () => ({ logAudit: jest.fn(), logSystem: jest.fn() }));
jest.mock("@/lib/email-templates", () => ({ sendTemplatedEmail: jest.fn().mockResolvedValue(true) }));
jest.mock("@/lib/email", () => ({ sendEmail: jest.fn().mockResolvedValue({ success: true }) }));

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { notifyPatient } from "@/lib/notify-patient";
import { sendTemplatedEmail } from "@/lib/email-templates";

const db = prisma as any;
const notificar = notifyPatient as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  (getServerSession as jest.Mock).mockResolvedValue({
    user: { id: "staff-1", role: "ADMIN", clinicId: "clinica-bpr", email: "admin@bpr.clinic" },
  });
  db.patientOutboundEmail.count.mockResolvedValue(0);
  db.systemLog.count.mockResolvedValue(0);
  db.systemLog.create.mockResolvedValue({});
});

// ─────────────────────────────────────────────────────────────────────────
describe("prescrever exercícios", () => {
  const { POST } = require("@/app/api/admin/exercise-prescriptions/route");

  const prescrever = (corpo: any) =>
    POST(
      new NextRequest("http://localhost/api/admin/exercise-prescriptions", {
        method: "POST",
        body: JSON.stringify(corpo),
      }) as any
    );

  const prepararBanco = () => {
    const paciente = {
      id: "p1", firstName: "Ana", lastName: "Prata", email: "ana@exemplo.com", clinicId: "clinica-bpr",
    };
    db.user.findUnique.mockResolvedValue(paciente);
    db.user.findFirst.mockResolvedValue(paciente);
    db.exercise.findMany.mockResolvedValue([{ id: "e1" }]);
    db.exercisePrescription.findMany.mockResolvedValue([]);
    db.exercisePrescription.create.mockImplementation(async ({ data }: any) => ({ id: "rx1", ...data }));
    db.exercisePrescription.createMany.mockResolvedValue({ count: 1 });
  };

  it("sem `notify`: prescreve e não manda nada", async () => {
    prepararBanco();
    const res = await prescrever({ patientId: "p1", exercises: [{ exerciseId: "e1" }] });
    expect(notificar).not.toHaveBeenCalled();
    expect(res.status).toBe(201);
  });

  it.each([[false], ["false"], [null], [undefined], [0]])(
    "`notify: %p` também não manda",
    async (notify) => {
      prepararBanco();
      await prescrever({ patientId: "p1", exercises: [{ exerciseId: "e1" }], notify });
      expect(notificar).not.toHaveBeenCalled();
    }
  );

  it("a resposta diz que não avisou, para a tela não supor", async () => {
    prepararBanco();
    const res = await prescrever({ patientId: "p1", exercises: [{ exerciseId: "e1" }] });
    const body = await res.json();
    expect(body.notified).toBeNull();
    expect(body.notifySkipped).toBe("not_requested");
  });

  /** Não trocar um defeito por outro: quem pede, recebe. */
  it("com `notify: true`: manda", async () => {
    prepararBanco();
    notificar.mockResolvedValue({ channel: "EMAIL", success: true });
    const res = await prescrever({ patientId: "p1", exercises: [{ exerciseId: "e1" }], notify: true });
    const body = await res.json();
    expect(notificar).toHaveBeenCalledTimes(1);
    expect(body.notifySkipped).toBeNull();
  });

  /** A prescrição é o ato principal e não pode depender do aviso. */
  it("não avisar não impede de prescrever", async () => {
    prepararBanco();
    await prescrever({ patientId: "p1", exercises: [{ exerciseId: "e1" }] });
    expect(db.exercisePrescription.create).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("o botão rotulado “simular e-mail”", () => {
  const { POST } = require("@/app/api/admin/email-test/route");

  it("não escreve para o paciente, mesmo recebendo o patientId dele", async () => {
    db.user.findUnique.mockResolvedValue({
      id: "p1", email: "ana@exemplo.com", firstName: "Ana", lastName: "Prata", clinicId: "clinica-bpr",
    });

    const res = await POST(
      new NextRequest("http://localhost/api/admin/email-test", {
        method: "POST",
        body: JSON.stringify({ action: "simulate_signup", patientId: "p1" }),
      }) as any
    );
    await res.json();

    const destino = (sendTemplatedEmail as jest.Mock).mock.calls[0]?.[1];
    expect(destino).toBe("admin@bpr.clinic");
    expect(destino).not.toBe("ana@exemplo.com");
  });
});
