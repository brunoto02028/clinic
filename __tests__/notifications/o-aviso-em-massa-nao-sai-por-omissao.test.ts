/**
 * @jest-environment node
 *
 * O aviso em massa não sai por omissão.
 *
 * `notify` nascia **`true`** nesta rota, e ela manda para **todos os
 * pacientes do inquilino**. A caixa vinha marcada: quem não soubesse
 * desmarcar, mandava. Três linhas abaixo, no mesmo arquivo, o `pushNotify`
 * já nascia `false` — dois padrões opostos convivendo.
 *
 * O QA por mutação da atividade 104 achou isto do pior jeito possível:
 * devolver o `notify = true` **não derrubava um único teste**. A rota mais
 * sensível do painel — a mesma que já teve vazamento entre inquilinos em
 * 11/09/2026 — não tinha nenhum teste de envio.
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    user: { findMany: jest.fn() },
    clinicBroadcast: { create: jest.fn(), findMany: jest.fn() },
    clinicMessage: { createMany: jest.fn() },
  },
}));
jest.mock("@/lib/notify-patient", () => ({
  notifyPatient: jest.fn(),
  pediramEnviarAoPaciente: (p: unknown) => p === true || p === "true",
}));
jest.mock("@/lib/push-send", () => ({
  sendPushToUsers: jest.fn(),
  countPushDevices: jest.fn().mockResolvedValue(0),
}));
jest.mock("@/lib/broadcast-dispatch", () => ({ dispatchDueBroadcasts: jest.fn() }));
jest.mock("@/lib/tenant-access", () => ({
  ...jest.requireActual("@/lib/tenant-access"),
  getActor: jest.fn(),
  requireStaff: jest.fn(),
  tenantWhere: () => ({ clinicId: "clinica-bpr" }),
}));
jest.mock("@/lib/patient-language", () => ({
  pickForPatient: (a: any) => a,
  groupByLang: (ps: any[]) => [{ lang: "en", patients: ps }],
}));

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getActor } from "@/lib/tenant-access";
import { notifyPatient } from "@/lib/notify-patient";
import { sendPushToUsers } from "@/lib/push-send";
import { POST } from "@/app/api/admin/broadcasts/route";

const db = prisma as any;

const enviar = (corpo: any) =>
  POST(
    new NextRequest("http://localhost/api/admin/broadcasts", {
      method: "POST",
      body: JSON.stringify({ title: "Aviso", content: "Texto", ...corpo }),
    }) as any
  );

beforeEach(() => {
  jest.clearAllMocks();
  (getActor as jest.Mock).mockResolvedValue({ userId: "staff-1", clinicId: "clinica-bpr", role: "ADMIN" });
  db.user.findMany.mockResolvedValue([
    { id: "p1", preferredLocale: "en-GB" },
    { id: "p2", preferredLocale: "pt-BR" },
  ]);
  db.clinicBroadcast.create.mockResolvedValue({ id: "b1", sentAt: new Date() });
  db.clinicMessage.createMany.mockResolvedValue({ count: 2 });
});

describe("o default", () => {
  it("sem `notify`, o aviso é gravado e **ninguém** recebe mensagem", async () => {
    await enviar({});
    expect(db.clinicBroadcast.create).toHaveBeenCalled();
    expect(notifyPatient).not.toHaveBeenCalled();
  });

  it.each([[false], ["false"], [null], [0]])("`notify: %p` também não manda", async (notify) => {
    await enviar({ notify });
    expect(notifyPatient).not.toHaveBeenCalled();
  });

  /** Não trocar um defeito por outro: quem pede, manda. */
  it("com `notify: true`, manda para cada paciente", async () => {
    await enviar({ notify: true });
    expect(notifyPatient).toHaveBeenCalledTimes(2);
  });

  it("push continua opt-in, como já era", async () => {
    await enviar({ notify: true });
    expect(sendPushToUsers).not.toHaveBeenCalled();
  });
});

describe("não atravessa inquilino", () => {
  it("os destinatários saem da clínica da sessão", async () => {
    await enviar({ notify: true });
    expect(db.user.findMany.mock.calls[0][0].where.clinicId).toBe("clinica-bpr");
  });
});
