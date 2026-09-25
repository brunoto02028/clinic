/**
 * @jest-environment node
 *
 * A agenda que a clínica configura, e os horários que sobram dela.
 *
 * As regras são dados: janelas por dia, o que cada uma atende, quantos cabem.
 * O que fica em código são os invariantes — duas janelas não se sobrepõem, a
 * capacidade não é estourada, e horário que já passou não aparece.
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    scheduleWindow: { findMany: jest.fn(), count: jest.fn() },
    scheduleException: { findMany: jest.fn() },
    appointment: { findMany: jest.fn() },
  },
}));

import { prisma } from "@/lib/db";
import { zonedTimeToUtc } from "@/lib/clinic-timezone";
import { slotsForDate, windowsForDate, overlaps } from "@/lib/schedule";

const janelas = (prisma as any).scheduleWindow;
const excecoes = (prisma as any).scheduleException;
const consultas = (prisma as any).appointment;

// Uma quinta-feira, escrita — não um `Date`. A agenda não lê o relógio do
// servidor em lugar nenhum desde o achado N1: em produção ele está em UTC, e
// lá a segunda devolvia as janelas de domingo.
const QUINTA = "2026-10-01";

// O instante que corresponde àquela hora **na clínica**, para o teste valer em
// qualquer fuso de máquina.
const consulta = (hora: number, minuto = 0, duracao = 60) => ({
  dateTime: zonedTimeToUtc(QUINTA, `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`),
  duration: duracao,
});

beforeEach(() => {
  jest.clearAllMocks();
  excecoes.findMany.mockResolvedValue([]);
  consultas.findMany.mockResolvedValue([]);
});

describe("overlaps", () => {
  it("recusa duas janelas na mesma faixa — a sala é uma só", () => {
    expect(overlaps({ startTime: "09:00", endTime: "13:00" }, { startTime: "12:00", endTime: "14:00" })).toBe(true);
    expect(overlaps({ startTime: "09:00", endTime: "13:00" }, { startTime: "13:00", endTime: "17:00" })).toBe(false);
  });
});

describe("slotsForDate", () => {
  it("consulta tem capacidade 1: marcou, sumiu", async () => {
    janelas.findMany.mockResolvedValue([
      { startTime: "09:00", endTime: "11:00", kind: "CONSULTATION", capacity: 1, slotMinutes: 60 },
    ]);
    consultas.findMany.mockResolvedValue([consulta(9)]);

    const s = await slotsForDate("c", "t", QUINTA);

    expect(s.map((x) => x.time)).toEqual(["10:00"]);
  });

  it("tratamento só some quando lota, e diz quantas vagas restam", async () => {
    janelas.findMany.mockResolvedValue([
      { startTime: "14:00", endTime: "16:00", kind: "TREATMENT", capacity: 4, slotMinutes: 60 },
    ]);
    consultas.findMany.mockResolvedValue([consulta(14), consulta(14), consulta(14), consulta(14)]);

    const s = await slotsForDate("c", "t", QUINTA);

    // 14h lotou (4 de 4); 15h continua inteiro
    expect(s.map((x) => x.time)).toEqual(["15:00"]);
    expect(s[0].spacesLeft).toBe(4);
  });

  it("a capacidade é de quem está na sala ao mesmo tempo, não do dia", async () => {
    janelas.findMany.mockResolvedValue([
      { startTime: "14:00", endTime: "17:00", kind: "TREATMENT", capacity: 2, slotMinutes: 60 },
    ]);
    consultas.findMany.mockResolvedValue([consulta(14), consulta(14)]);

    const s = await slotsForDate("c", "t", QUINTA);

    // 14h cheio, mas 15h e 16h seguem com as duas vagas
    expect(s.map((x) => `${x.time}:${x.spacesLeft}`)).toEqual(["15:00:2", "16:00:2"]);
  });

  it("dois tipos no mesmo dia, cada um na sua janela", async () => {
    janelas.findMany.mockResolvedValue([
      { startTime: "09:00", endTime: "10:00", kind: "CONSULTATION", capacity: 1, slotMinutes: 60 },
      { startTime: "14:00", endTime: "15:00", kind: "TREATMENT", capacity: 3, slotMinutes: 60 },
    ]);

    const todos = await slotsForDate("c", "t", QUINTA);
    expect(todos.map((s) => `${s.time}/${s.kind}`)).toEqual(["09:00/CONSULTATION", "14:00/TREATMENT"]);

    const soConsulta = await slotsForDate("c", "t", QUINTA, { kind: "CONSULTATION" });
    expect(soConsulta.map((s) => s.time)).toEqual(["09:00"]);
  });

  it("respeita o passo configurado", async () => {
    janelas.findMany.mockResolvedValue([
      { startTime: "09:00", endTime: "10:30", kind: "TREATMENT", capacity: 2, slotMinutes: 30 },
    ]);

    const s = await slotsForDate("c", "t", QUINTA);
    expect(s.map((x) => x.time)).toEqual(["09:00", "09:30", "10:00"]);
  });

  it("horário que já começou não aparece", async () => {
    janelas.findMany.mockResolvedValue([
      { startTime: "09:00", endTime: "12:00", kind: "CONSULTATION", capacity: 1, slotMinutes: 60 },
    ]);

    const s = await slotsForDate("c", "t", QUINTA, { nowMinutes: 10 * 60 + 5 });
    expect(s.map((x) => x.time)).toEqual(["11:00"]);
  });

  it("sem janela configurada, não inventa horário", async () => {
    janelas.findMany.mockResolvedValue([]);
    expect(await slotsForDate("c", "t", QUINTA)).toEqual([]);
  });
});

describe("windowsForDate — a exceção", () => {
  it("dia fechado não tem janela nenhuma", async () => {
    excecoes.findMany.mockResolvedValue([{ therapistId: null, closed: true }]);
    janelas.findMany.mockResolvedValue([
      { startTime: "09:00", endTime: "17:00", kind: "CONSULTATION", capacity: 1, slotMinutes: 60 },
    ]);

    expect(await windowsForDate("c", "t", QUINTA)).toEqual([]);
  });

  it("expediente mais curto apara a janela em vez de apagá-la", async () => {
    excecoes.findMany.mockResolvedValue([
      { therapistId: null, closed: false, startTime: null, endTime: "15:00" },
    ]);
    janelas.findMany.mockResolvedValue([
      { startTime: "09:00", endTime: "13:00", kind: "CONSULTATION", capacity: 1, slotMinutes: 60 },
      { startTime: "14:00", endTime: "18:00", kind: "TREATMENT", capacity: 3, slotMinutes: 60 },
    ]);

    const w = await windowsForDate("c", "t", QUINTA);

    expect(w.map((x) => `${x.startTime}-${x.endTime}`)).toEqual(["09:00-13:00", "14:00-15:00"]);
  });

  it("a exceção do terapeuta vence a da clínica", async () => {
    // Pedir isso ao banco com `orderBy therapistId desc` não funciona: no
    // Postgres, DESC é NULLS FIRST, e a linha da clínica (nula) ganhava — um
    // terapeuta de folga aparecia disponível (QA de 25/09, falha 5).
    excecoes.findMany.mockResolvedValue([
      { therapistId: null, closed: false, startTime: null, endTime: "10:00" },
      { therapistId: "t", closed: true },
    ]);
    janelas.findMany.mockResolvedValue([
      { startTime: "09:00", endTime: "17:00", kind: "CONSULTATION", capacity: 1, slotMinutes: 60 },
    ]);

    // A do terapeuta fecha o dia; a da clínica só o encurtaria.
    expect(await windowsForDate("c", "t", QUINTA)).toEqual([]);
  });

  it("a data e o dia da semana saem da data escrita, não do relógio do servidor", async () => {
    // A primeira correção trocou `toISOString()` por leitura local — e local é
    // o fuso **do servidor**, que em produção é UTC. A segunda passava a
    // devolver as janelas de domingo (QA de 25/09, N1).
    janelas.findMany.mockResolvedValue([]);

    await windowsForDate("c", "t", "2026-07-15"); // uma quarta-feira

    expect(excecoes.findMany.mock.calls[0][0].where.date).toBe("2026-07-15");
    expect(janelas.findMany.mock.calls[0][0].where.dayOfWeek).toBe(3);
  });

  it("o dia da semana não muda com o fuso da máquina", async () => {
    janelas.findMany.mockResolvedValue([]);

    // Domingo, e continua domingo em qualquer lugar do mundo.
    await windowsForDate("c", "t", "2026-10-04");
    expect(janelas.findMany.mock.calls[0][0].where.dayOfWeek).toBe(0);
  });
});
