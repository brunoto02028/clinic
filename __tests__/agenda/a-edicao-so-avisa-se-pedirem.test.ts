/**
 * @jest-environment node
 *
 * Salvar uma edição não fala com o paciente sozinho.
 *
 * Regra da casa, 17/09/2026: *nada sai para paciente sem alguém pedir*. A
 * criação passou a obedecê-la; a edição ficou de fora, e o QA de 29/09 mostrou
 * o resultado — abrir o diálogo, **não mudar nada**, salvar, e o paciente
 * recebia *"Appointment Confirmed … has been successfully booked"* sobre uma
 * consulta antiga.
 *
 * Pior que a edição: como o assunto do e-mail só troca no cancelamento, marcar
 * uma consulta como **atendida** ou **faltou** mandava ao paciente uma
 * confirmação de marcação nova.
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    appointment: { findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    clinic: { findUnique: jest.fn() },
  },
}));
jest.mock("@/lib/tenant-access", () => ({
  ...jest.requireActual("@/lib/tenant-access"),
  getActor: jest.fn(),
  getSessionStaffActor: jest.fn(),
}));
jest.mock("@/lib/notify-patient", () => ({
  ...jest.requireActual("@/lib/notify-patient"),
  notifyPatient: jest.fn(),
}));
jest.mock("@/lib/push-notify", () => ({ pushConsulta: jest.fn() }));
jest.mock("@/lib/package-sessions", () => ({ syncSessionsUsed: jest.fn() }));
jest.mock("@/lib/waitlist", () => ({ notifyWaitlistForCancelledAppointment: jest.fn() }));

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionStaffActor, getActor } from "@/lib/tenant-access";
import { notifyPatient } from "@/lib/notify-patient";
import { pushConsulta } from "@/lib/push-notify";
import { PUT } from "@/app/api/appointments/[id]/route";

const db = prisma as any;
const staffMock = getSessionStaffActor as jest.Mock;
const actorMock = getActor as jest.Mock;
const email = notifyPatient as jest.Mock;
const push = pushConsulta as jest.Mock;

const CONSULTA = {
  id: "c1",
  status: "CONFIRMED",
  clinicId: "clinicaA",
  dateTime: new Date("2026-10-20T09:00:00.000Z"),
  duration: 60,
  treatmentType: "Assessment",
  notes: "",
  patientId: "p1",
  patient: { id: "p1", firstName: "Ana", lastName: "Lima", clinicId: "clinicaA" },
  therapist: { id: "t1", firstName: "Bruno", lastName: "T" },
};

const entraComo = (role: string, userId = "admin1") => {
  const actor = { userId, role, clinicId: "clinicaA", isImpersonating: false };
  staffMock.mockResolvedValue(role === "PATIENT" ? null : actor);
  actorMock.mockResolvedValue(actor);
};

const salvar = (body: any) =>
  PUT(
    new NextRequest("http://localhost/x", { method: "PUT", body: JSON.stringify(body) }),
    { params: { id: "c1" } }
  );

beforeEach(() => {
  jest.clearAllMocks();
  db.appointment.findUnique.mockResolvedValue(CONSULTA);
  db.appointment.update.mockResolvedValue(CONSULTA);
  db.clinic.findUnique.mockResolvedValue({ name: "BPR", address: "1 St", city: "London" });
  email.mockResolvedValue(undefined);
  push.mockResolvedValue(undefined);
});

describe("o campo ausente não envia", () => {
  it("**salvar sem pedir não manda e-mail nem toca o telefone**", async () => {
    // O caso exato do QA: o diálogo aberto e salvo sem mudar nada.
    entraComo("ADMIN");
    const res = await salvar({ price: 80 });
    expect(res.status).toBe(200);
    expect(email).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("pedir explicitamente manda os dois", async () => {
    entraComo("ADMIN");
    await salvar({ price: 80, notifyPatient: true });
    expect(email).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('a string "true", que é o que um formulário manda, também vale', async () => {
    entraComo("ADMIN");
    await salvar({ price: 80, notifyPatient: "true" });
    expect(email).toHaveBeenCalledTimes(1);
  });

  it.each([[false], ["false"], [null], [0], ["sim"]])(
    "%p não é um pedido",
    async (valor) => {
      entraComo("ADMIN");
      await salvar({ price: 80, notifyPatient: valor });
      expect(email).not.toHaveBeenCalled();
      expect(push).not.toHaveBeenCalled();
    }
  );
});

describe("fechar o atendimento não é falar com o paciente", () => {
  it.each(["COMPLETED", "NO_SHOW"])(
    "**marcar %s em silêncio** — antes mandava uma confirmação de marcação",
    async (status) => {
      entraComo("ADMIN");
      await salvar({ status });
      expect(email).not.toHaveBeenCalled();
      expect(push).not.toHaveBeenCalled();
    }
  );

  it("o cancelamento pedido pela clínica sai, e sai como cancelamento", async () => {
    entraComo("ADMIN");
    await salvar({ status: "CANCELLED", notifyPatient: true });
    expect(email.mock.calls[0][0].emailTemplateSlug).toBe("APPOINTMENT_CANCELLED");
    expect(push.mock.calls[0][1]).toBe("cancelada");
  });

  it("uma mudança que não é cancelamento vai pelo outro modelo", async () => {
    entraComo("ADMIN");
    await salvar({ dateTime: "2026-10-21T09:00:00.000Z", notifyPatient: true });
    expect(email.mock.calls[0][0].emailTemplateSlug).toBe("APPOINTMENT_CONFIRMATION");
    expect(push.mock.calls[0][1]).toBe("remarcada");
  });
});

describe("quem cancela a própria consulta", () => {
  it("**recebe o recibo do próprio ato, sem precisar de pedir**", async () => {
    // O paciente não tem caixa para marcar; a rota dele aceita `status` e mais
    // nada. Exigir o pedido aqui seria silenciar a confirmação de quem acabou
    // de cancelar — e exigiria um build novo do aplicativo para a repor.
    entraComo("PATIENT", "p1");
    await salvar({ status: "CANCELLED" });
    expect(email).toHaveBeenCalledTimes(1);
  });

  it("mas o telefone dele não toca com o que ele mesmo fez", async () => {
    entraComo("PATIENT", "p1");
    await salvar({ status: "CANCELLED" });
    expect(push).not.toHaveBeenCalled();
  });
});
