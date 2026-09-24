/**
 * Which calendar day an exercise log belongs to (activity 074, auditoria de
 * paridade, achado F-1).
 *
 * `ExerciseCompletionLog.completedDate` is a Postgres `DATE`, and the write
 * side stores midnight **UTC** of the clinic's day. The read used local
 * midnight, so under British Summer Time the window Prisma sent was
 * 23:00Z→23:00Z; Postgres truncated both ends to a DATE and the panel asked
 * for yesterday. QA saw an exercise marked today come back as "missing".
 *
 * This test pins the two sides together: the day the panel asks for must be
 * the day the app writes.
 */
jest.mock("@/lib/db", () => ({ prisma: {} }));

import { startOfDay } from "@/lib/patient-daily-adherence";

/** Exactly what app/api/exercises and /api/patient/protocol store. */
function whatTheWriteStores(now: Date): Date {
  const dateStr = now.toLocaleDateString("en-CA", { timeZone: "Europe/London" });
  return new Date(`${dateStr}T00:00:00.000Z`);
}

describe("startOfDay (o dia que o painel pergunta)", () => {
  it("bate com o dia que a rota do app grava, em horário de verão britânico", () => {
    // 24/09/2026 às 07:08 UTC — BST, então 08:08 em Londres, mesmo dia.
    const now = new Date("2026-09-24T07:08:31.000Z");
    expect(startOfDay(now).toISOString()).toBe(whatTheWriteStores(now).toISOString());
    expect(startOfDay(now).toISOString()).toBe("2026-09-24T00:00:00.000Z");
  });

  it("bate também de madrugada, que é quando o fuso separa os dois", () => {
    // 00:30 em Londres = 23:30Z do dia anterior. O dia da clínica é o 24.
    const now = new Date("2026-09-23T23:30:00.000Z");
    expect(startOfDay(now).toISOString()).toBe(whatTheWriteStores(now).toISOString());
    expect(startOfDay(now).toISOString()).toBe("2026-09-24T00:00:00.000Z");
  });

  it("bate no inverno, quando Londres é UTC", () => {
    const now = new Date("2026-01-15T09:00:00.000Z");
    expect(startOfDay(now).toISOString()).toBe(whatTheWriteStores(now).toISOString());
    expect(startOfDay(now).toISOString()).toBe("2026-01-15T00:00:00.000Z");
  });

  it("devolve sempre meia-noite UTC, que é como a coluna DATE é comparada", () => {
    for (const iso of ["2026-09-24T07:08:31.000Z", "2026-06-01T22:59:59.000Z", "2026-12-31T23:59:59.000Z"]) {
      const d = startOfDay(new Date(iso));
      expect(d.getUTCHours()).toBe(0);
      expect(d.getUTCMinutes()).toBe(0);
    }
  });
});
