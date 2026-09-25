/**
 * @jest-environment node
 *
 * A porta automática é o caminho comum, não a única entrada.
 *
 * Uma regra com um caminho só vira empecilho no primeiro caso fora da curva —
 * e numa clínica pequena o caso fora da curva é semanal. Cortesia e isenção
 * existem para isso, e **têm dono**: sem registro, daqui a três meses ninguém
 * sabe quem liberou nem por quê, e a pergunta aparece justamente quando a
 * conta não fecha.
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    user: { findFirst: jest.fn() },
    clinic: { findUnique: jest.fn() },
    patientPackage: { findFirst: jest.fn() },
    appointment: { create: jest.fn() },
  },
}));
jest.mock("@/lib/clinic-context", () => ({ getClinicContext: jest.fn() }));
jest.mock("@/lib/system-logger", () => ({ logAudit: jest.fn(async () => {}) }));
jest.mock("@/lib/package-sessions", () => ({ syncSessionsUsed: jest.fn(async () => 0) }));
jest.mock("@/lib/lead-magnet", () => ({ logBookedEventForEmail: jest.fn(async () => {}), logEvent: jest.fn(async () => {}) }));

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicContext } from "@/lib/clinic-context";
import { logAudit } from "@/lib/system-logger";
import { syncSessionsUsed } from "@/lib/package-sessions";
import { POST } from "@/app/api/admin/appointments/route";

const users = (prisma as any).user;
const pacotes = (prisma as any).patientPackage;
const consultas = (prisma as any).appointment;

const req = (body: any) =>
  new NextRequest("http://localhost/api/admin/appointments", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

const corpo = (over: any = {}) => ({
  patientId: "p1",
  dateTime: "2026-10-01T10:00:00.000Z",
  treatmentType: "Session",
  price: 55,
  sendConfirmation: false,
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  (getClinicContext as jest.Mock).mockResolvedValue({
    clinicId: "clinicaA", userRole: "ADMIN", userId: "admin1",
  });
  users.findFirst.mockResolvedValue({ id: "p1" });
  pacotes.findFirst.mockResolvedValue({ id: "pac1" });
  consultas.create.mockImplementation(async ({ data }: any) => ({
    id: "a1", ...data, patient: { id: "p1", email: "p@x.test", firstName: "P", lastName: "T" },
    therapist: { id: "admin1", firstName: "A", lastName: "D" },
  }));
});

describe("POST /api/admin/appointments — a clínica anula", () => {
  it("marcar pela clínica não cobra sozinho e não vira sessão de pacote", async () => {
    await POST(req(corpo()));

    const data = consultas.create.mock.calls[0][0].data;
    expect(data.kind).toBe("CLINIC_BOOKED");
    expect(data.patientPackageId).toBeNull();
    expect(data.price).toBe(55);
    expect(logAudit).not.toHaveBeenCalled();
  });

  it("cortesia sai do pacote mesmo esgotado — e fica registrada com autor", async () => {
    await POST(req(corpo({ courtesySession: true, overrideReason: "remarcação por falta minha" })));

    const data = consultas.create.mock.calls[0][0].data;
    // Para o paciente é uma sessão do pacote dele, não uma avulsa que a
    // clínica esqueceu de cobrar.
    expect(data.kind).toBe("PACKAGE_SESSION");
    expect(data.patientPackageId).toBe("pac1");

    const auditoria = (logAudit as jest.Mock).mock.calls[0][0];
    expect(auditoria.action).toBe("APPOINTMENT_COURTESY_SESSION");
    expect(auditoria.userId).toBe("admin1");
    expect(auditoria.metadata.reason).toBe("remarcação por falta minha");

    expect(syncSessionsUsed).toHaveBeenCalledWith("pac1");
  });

  it("isenção zera o preço e fica registrada", async () => {
    await POST(req(corpo({ waiveCharge: true, price: 55 })));

    expect(consultas.create.mock.calls[0][0].data.price).toBe(0);
    expect((logAudit as jest.Mock).mock.calls[0][0].action).toBe("APPOINTMENT_CHARGE_WAIVED");
  });

  it("cortesia sem pacote nenhum não inventa vínculo", async () => {
    pacotes.findFirst.mockResolvedValue(null);

    await POST(req(corpo({ courtesySession: true })));

    const data = consultas.create.mock.calls[0][0].data;
    expect(data.patientPackageId).toBeNull();
    expect(data.kind).toBe("CLINIC_BOOKED");
  });

  it("paciente de outra clínica é recusado", async () => {
    users.findFirst.mockResolvedValue(null);

    const res = await POST(req(corpo({ courtesySession: true })));

    expect(res.status).toBe(404);
    expect(consultas.create).not.toHaveBeenCalled();
  });

  it("quem não é staff não passa", async () => {
    (getClinicContext as jest.Mock).mockResolvedValue({
      clinicId: "clinicaA", userRole: "PATIENT", userId: "p1",
    });

    const res = await POST(req(corpo({ waiveCharge: true })));

    expect(res.status).toBe(401);
    expect(consultas.create).not.toHaveBeenCalled();
  });
});
