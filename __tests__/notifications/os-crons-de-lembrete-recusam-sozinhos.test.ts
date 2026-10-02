/**
 * @jest-environment node
 *
 * Os quatro crons de lembrete recusam sozinhos.
 *
 * Em 17/09/2026 o Bruno mandou desligá-los. A decisão foi executada
 * **desmarcando a tarefa agendada no painel do Coolify** — fora do
 * repositório. O código ficou como estava: o único `return` antecipado em
 * cada um era o 401 do `cronSecret`, então religar aquele botão voltava a
 * mandar sem mudar uma linha aqui.
 *
 * O repositório até sabia: `lib/notify-patient.ts` tem um comentário
 * avisando do risco. Mas comentário não recusa pedido.
 *
 * Estes testes existem para que a política pare de depender de alguém
 * lembrar de um painel. E o par é obrigatório — o teste de que **volta a
 * funcionar** com a variável ligada é o que impede a trava de virar código
 * morto que ninguém sabe se ainda faz alguma coisa.
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    appointment: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    treatmentProtocol: { findMany: jest.fn().mockResolvedValue([]) },
    clinic: { findMany: jest.fn().mockResolvedValue([]) },
    bloodPressureReading: { findFirst: jest.fn().mockResolvedValue(null) },
    auditLog: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
  },
}));
jest.mock("@/lib/notify-patient", () => ({ notifyPatient: jest.fn() }));
jest.mock("@/lib/push-notify", () => ({
  pushLembrete: jest.fn(),
  pushConsulta: jest.fn(),
  pushTarefa: jest.fn(),
}));

import { NextRequest } from "next/server";
import { notifyPatient } from "@/lib/notify-patient";

const CHAVE = "segredo-de-teste";

const rotas = [
  ["appointment-reminders", () => require("@/app/api/cron/appointment-reminders/route")],
  ["exercise-reminders", () => require("@/app/api/cron/exercise-reminders/route")],
  ["bp-reminders", () => require("@/app/api/cron/bp-reminders/route")],
  ["onboarding-reminder", () => require("@/app/api/cron/onboarding-reminder/route")],
] as const;

const pedido = (nome: string) =>
  new NextRequest(`http://localhost/api/cron/${nome}?key=${CHAVE}`, { method: "POST" }) as any;

const chamar = async (mod: any, nome: string) => {
  const handler = mod.POST || mod.GET;
  return handler(pedido(nome), { params: {} });
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.CRON_SECRET = CHAVE;
  delete process.env.PATIENT_REMINDER_CRONS;
});

describe.each(rotas)("%s", (nome, carregar) => {
  it("com a chave certa e a política desligada: recusa e não manda nada", async () => {
    const res = await chamar(carregar(), nome);
    const body = await res.json();

    expect(body.disabled).toBe(true);
    expect(notifyPatient).not.toHaveBeenCalled();
  });

  /**
   * O par do teste acima. Sem ele, apagar o corpo inteiro da rota deixaria
   * tudo verde — a trava passaria a ser a única coisa que funciona.
   */
  it("com a política ligada: deixa de recusar", async () => {
    process.env.PATIENT_REMINDER_CRONS = "on";
    const res = await chamar(carregar(), nome);
    const body = await res.json();

    expect(body.disabled).toBeUndefined();
  });

  it("chave errada continua dando 401, antes de qualquer outra coisa", async () => {
    const mod: any = carregar();
    const handler = mod.POST || mod.GET;
    const res = await handler(
      new NextRequest(`http://localhost/api/cron/${nome}?key=errada`, { method: "POST" }) as any,
      { params: {} }
    );

    expect(res.status).toBe(401);
    expect(notifyPatient).not.toHaveBeenCalled();
  });
});
