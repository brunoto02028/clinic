/**
 * @jest-environment node
 *
 * Standalone prescriptions of exercises from protocol weeks the patient can't
 * see yet stay hidden too (activity 45) — in the app's Exercises tab and the
 * "new exercises" notification.
 */

jest.mock("@/lib/db", () => ({ prisma: { treatmentProtocol: { findMany: jest.fn() } } }));

import { prisma } from "@/lib/db";
import { gatedExerciseIds, gatedProtocolExerciseIds } from "@/lib/protocol-exercise-gating";

const item = (exerciseId: string | null, over: Record<string, any> = {}) => ({
  exerciseId,
  hiddenFromPatient: false,
  startWeek: 1,
  ...over,
});
const protocol = (items: any[], over: Record<string, any> = {}) => ({
  releasedThroughWeek: null,
  packages: [],
  items,
  ...over,
});

describe("gatedExerciseIds", () => {
  it("gates exercises only linked by hidden items", () => {
    const ids = gatedExerciseIds([
      protocol([item("quad"), item("lunge", { hiddenFromPatient: true, startWeek: 10 }), item(null, { hiddenFromPatient: true })]),
    ]);
    expect([...ids]).toEqual(["lunge"]);
  });

  it("doesn't gate an exercise the patient already sees in another item or protocol", () => {
    const ids = gatedExerciseIds([
      protocol([item("squat", { hiddenFromPatient: true, startWeek: 8 })]),
      protocol([item("squat", { startWeek: 1 })]),
    ]);
    expect(ids.size).toBe(0);
  });

  it("gates items beyond the released week", () => {
    const ids = gatedExerciseIds([
      protocol([item("a", { startWeek: 1 }), item("b", { startWeek: 3 }), item("c", { startWeek: null })], { releasedThroughWeek: 2 }),
    ]);
    expect([...ids]).toEqual(["b"]);
  });

  it("gates everything behind an unpaid package", () => {
    const ids = gatedExerciseIds([protocol([item("a"), item("b")], { packages: [{ isPaid: false }] })]);
    expect([...ids].sort()).toEqual(["a", "b"]);
    expect(gatedExerciseIds([protocol([item("a")], { packages: [{ isPaid: true }] })]).size).toBe(0);
  });
});

describe("gatedProtocolExerciseIds", () => {
  it("reads only the patient's sent protocols, with the latest package", async () => {
    (prisma as any).treatmentProtocol.findMany.mockResolvedValue([
      protocol([item("x", { hiddenFromPatient: true })]),
    ]);
    const ids = await gatedProtocolExerciseIds("p1");
    expect([...ids]).toEqual(["x"]);
    const args = (prisma as any).treatmentProtocol.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ patientId: "p1", status: "SENT_TO_PATIENT" });
    expect(args.select.packages).toMatchObject({ orderBy: { createdAt: "desc" }, take: 1 });
  });
});
