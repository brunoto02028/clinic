/**
 * @jest-environment node
 *
 * A fila de espera avisa pelos dois canais, e na hora certa.
 *
 * Duas decisões do Bruno, 29/09/2026:
 *
 * 1. A vaga que abre é **perecível** — avisa sempre, no app e por e-mail. Uma
 *    fila que não avisa não é fila.
 * 2. `notifyPatient` escolhe **um** canal pela preferência da pessoa, e quem
 *    tem WhatsApp ou SMS marcado nunca via o e-mail.
 *
 * E o fuso: o anúncio saía do relógio do contêiner, que é UTC. Durante os sete
 * meses de horário de verão britânico, a vaga das 10:00 era anunciada como
 * 09:00 — e quem corresse para marcar chegaria uma hora antes.
 */

// O fuso vem do `jest.config.js`, que põe o processo em **UTC** — o do
// contêiner. Não dá para resolver aqui: escrever `process.env.TZ` no topo deste
// arquivo **não funciona**, porque o worker do jest já fez contas com datas e o
// Node cacheou o fuso. Eu tentei, o teste passou, e a prova por mutação mostrou
// que não media nada.
//
// A asserção abaixo existe para este teste **falhar alto** se alguém tirar a
// linha do config: sem UTC, a máquina de Londres faz o defeito desaparecer.

jest.mock("@/lib/db", () => ({
  prisma: {
    waitlistEntry: { findMany: jest.fn(), update: jest.fn() },
  },
}));
jest.mock("@/lib/notify-patient", () => ({ notifyPatient: jest.fn() }));
jest.mock("@/lib/push-notify", () => ({ pushVagaNaFila: jest.fn() }));
// `.mockResolvedValue` e não `jest.fn()` pelado: a fila faz
// `seedDefaultTemplates().catch(...)`, e um mock que devolve `undefined` estoura
// no `.catch` — o erro cai no try/catch de fora e a função responde
// `{ matched: 0 }`, como se a fila estivesse vazia. Um mock tem de ser um estado
// que o mundo real produza.
jest.mock("@/lib/email-templates", () => ({
  seedDefaultTemplates: jest.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/lib/db";
import { notifyPatient } from "@/lib/notify-patient";
import { pushVagaNaFila } from "@/lib/push-notify";
import { notifyWaitlistForCancelledAppointment } from "@/lib/waitlist";

const db = prisma as any;
const email = notifyPatient as jest.Mock;
const push = pushVagaNaFila as jest.Mock;

/** 20/10/2026 às 10:00 **em Londres** — 09:00 em UTC, que é o do contêiner. */
const DEZ_DA_MANHA_EM_LONDRES = new Date("2026-10-20T09:00:00.000Z");

const vaga = (quando = DEZ_DA_MANHA_EM_LONDRES) => ({
  id: "a1",
  clinicId: "clinicaA",
  therapistId: "t1",
  treatmentType: "Assessment",
  dateTime: quando,
});

beforeEach(() => {
  jest.clearAllMocks();
  db.waitlistEntry.findMany.mockResolvedValue([
    { id: "w1", patientId: "p1" },
    { id: "w2", patientId: "p2" },
  ]);
  db.waitlistEntry.update.mockResolvedValue({});
  email.mockResolvedValue({ channel: "EMAIL", success: true });
  push.mockResolvedValue({ sent: 1 });
});

describe("os dois canais, para cada pessoa da fila", () => {
  it("**toca o telefone e manda a carta** — uma de cada, por pessoa", async () => {
    const r = await notifyWaitlistForCancelledAppointment(vaga());
    expect(r).toEqual({ matched: 2, notified: 2 });
    expect(push).toHaveBeenCalledTimes(2);
    expect(email).toHaveBeenCalledTimes(2);
    expect(push.mock.calls.map((c) => c[0])).toEqual(["p1", "p2"]);
  });

  it("**o e-mail é forçado**, e não deixado à preferência da pessoa", async () => {
    // Sem isto, quem tem WhatsApp ou SMS marcado não recebe a carta — e para
    // uma vaga perecível o canal preferido pode falhar em silêncio.
    await notifyWaitlistForCancelledAppointment(vaga());
    expect(email.mock.calls[0][0].forceChannel).toBe("EMAIL");
  });

  it("a fila é marcada como avisada, uma linha por pessoa", async () => {
    await notifyWaitlistForCancelledAppointment(vaga());
    expect(db.waitlistEntry.update).toHaveBeenCalledTimes(2);
    expect(db.waitlistEntry.update.mock.calls[0][0].data.status).toBe("NOTIFIED");
  });

  it("ninguém na fila: ninguém é avisado, e não estoura", async () => {
    db.waitlistEntry.findMany.mockResolvedValue([]);
    const r = await notifyWaitlistForCancelledAppointment(vaga());
    expect(r).toEqual({ matched: 0, notified: 0 });
    expect(push).not.toHaveBeenCalled();
    expect(email).not.toHaveBeenCalled();
  });
});

describe("a hora anunciada é a do relógio da clínica", () => {
  it("**10:00, e não 09:00**, com o processo em UTC", async () => {
    expect(process.env.TZ).toBe("UTC");
    await notifyWaitlistForCancelledAppointment(vaga());
    const vars = email.mock.calls[0][0].emailVars;
    expect(vars.appointmentTime).toBe("10:00");
    expect(vars.appointmentDate).toContain("20 October 2026");
  });

  it("o texto simples diz a mesma hora que o e-mail", async () => {
    // Duas fontes para a mesma hora é como se descobre, meses depois, que uma
    // delas nunca foi corrigida.
    await notifyWaitlistForCancelledAppointment(vaga());
    const chamada = email.mock.calls[0][0];
    expect(chamada.plainMessage).toContain("at 10:00");
    expect(chamada.plainMessagePt).toContain("às 10:00");
  });

  it("no inverno, quando Londres é UTC, a hora não se mexe", async () => {
    // O controle que prova que a correção soma o fuso e não uma hora fixa.
    await notifyWaitlistForCancelledAppointment(vaga(new Date("2026-01-20T10:00:00.000Z")));
    expect(email.mock.calls[0][0].emailVars.appointmentTime).toBe("10:00");
  });
});

describe("falhar em avisar não desfaz o cancelamento", () => {
  it("o erro de uma pessoa não impede o aviso da seguinte", async () => {
    push.mockRejectedValueOnce(new Error("sem aparelho"));
    const r = await notifyWaitlistForCancelledAppointment(vaga());
    expect(r.notified).toBe(1);
    expect(push).toHaveBeenCalledTimes(2);
  });
});
