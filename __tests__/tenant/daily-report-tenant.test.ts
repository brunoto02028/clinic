/**
 * @jest-environment node
 *
 * O relatório diário de adesão não pode misturar tenants.
 *
 * Ele varria **todas** as clínicas ativas e mandava tudo para um endereço fixo,
 * `admin@bpr.clinic`. O estúdio do Emanuel é outro produto dentro do mesmo
 * sistema: o relatório dele, com o nome dos alunos no corpo, caía na caixa da
 * BPR. Mesma família do incidente de broadcast de 11/09.
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    clinic: { findMany: jest.fn() },
    auditLog: { findFirst: jest.fn() },
  },
}));
jest.mock("@/lib/clinic-daily-adherence", () => ({ getClinicDailyAdherence: jest.fn() }));
jest.mock("@/lib/clinic-waiting", () => ({
  getClinicWaiting: jest.fn(),
  waitingEmailBlock: jest.fn(() => ""),
}));
jest.mock("@/lib/daily-adherence-email", () => ({
  buildDailyAdherenceEmail: jest.fn(async () => "<html></html>"),
  REPORT_ACTION: "DAILY_ADHERENCE_REPORT_SENT",
}));
jest.mock("@/lib/email", () => ({ sendEmail: jest.fn(async () => ({ success: true })) }));
jest.mock("@/lib/system-logger", () => ({ logAudit: jest.fn(async () => {}) }));
jest.mock("@/lib/admin-notify-email", () => ({ getAdminNotificationEmail: jest.fn() }));

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicDailyAdherence } from "@/lib/clinic-daily-adherence";
import { getClinicWaiting } from "@/lib/clinic-waiting";
import { sendEmail } from "@/lib/email";
import { getAdminNotificationEmail } from "@/lib/admin-notify-email";
import { POST } from "@/app/api/cron/daily-report/route";

const clinics = (prisma as any).clinic;
const audit = (prisma as any).auditLog;

const req = () =>
  new NextRequest(`http://localhost/api/cron/daily-report?key=${process.env.NEXTAUTH_SECRET}`, {
    method: "POST",
  });

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXTAUTH_SECRET = "segredo-de-teste";
  clinics.findMany.mockResolvedValue([{ id: "bpr", name: "BPR" }]);
  audit.findFirst.mockResolvedValue(null);
  (getClinicDailyAdherence as jest.Mock).mockResolvedValue({
    completed: [{ name: "Alguém", missingItems: [] }],
    missing: [],
  });
  (getClinicWaiting as jest.Mock).mockResolvedValue({
    exerciseVideos: 0, unreadMessages: 0, unassignedMeasurements: 0, total: 0,
  });
  (getAdminNotificationEmail as jest.Mock).mockResolvedValue("admin@bpr.clinic");
});

describe("POST /api/cron/daily-report", () => {
  it("só percorre clínicas — um estúdio de personal não entra", async () => {
    await POST(req());

    expect(clinics.findMany.mock.calls[0][0].where).toEqual({ isActive: true, type: "CLINIC" });
  });

  it("resolve o destinatário por tenant, em vez de um endereço fixo", async () => {
    clinics.findMany.mockResolvedValue([
      { id: "bpr", name: "BPR" },
      { id: "outra", name: "Outra Clínica" },
    ]);
    (getAdminNotificationEmail as jest.Mock)
      .mockResolvedValueOnce("admin@bpr.clinic")
      .mockResolvedValueOnce("contato@outra.example");

    await POST(req());

    expect(getAdminNotificationEmail).toHaveBeenCalledWith("bpr");
    expect(getAdminNotificationEmail).toHaveBeenCalledWith("outra");

    const destinos = (sendEmail as jest.Mock).mock.calls.map((c) => c[0].to);
    expect(destinos).toEqual(["admin@bpr.clinic", "contato@outra.example"]);
    // O que não pode acontecer: a segunda clínica indo para a caixa da primeira.
    expect(destinos.filter((d) => d === "admin@bpr.clinic")).toHaveLength(1);
  });

  it("chave errada não roda nada", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/cron/daily-report?key=errada", { method: "POST" })
    );

    expect(res.status).toBe(401);
    expect(clinics.findMany).not.toHaveBeenCalled();
  });
});
