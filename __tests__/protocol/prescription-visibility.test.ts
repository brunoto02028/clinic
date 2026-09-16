/**
 * @jest-environment node
 *
 * A prescription created by assigning a protocol follows that plan (activity
 * 46): archived or pulled back to draft, it leaves the patient's app with the
 * plan; a prescription made on its own keeps the activity-45 rule.
 */

jest.mock("@/lib/db", () => ({ prisma: { treatmentProtocol: { findMany: jest.fn() } } }));

import { prisma } from "@/lib/db";
import {
  exerciseVisibility,
  protocolExerciseVisibility,
  visiblePrescriptionWhere,
  patientPrescriptionWhere,
} from "@/lib/protocol-exercise-gating";

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
const sorted = (v: { visible: string[]; gated: string[] }) => ({
  visible: [...v.visible].sort(),
  gated: [...v.gated].sort(),
});

beforeEach(() => jest.resetAllMocks());

describe("exerciseVisibility", () => {
  it("splits what the patient sees from what is still held back", () => {
    const v = exerciseVisibility([
      protocol([item("quad"), item("lunge", { hiddenFromPatient: true, startWeek: 10 }), item(null, { hiddenFromPatient: true })]),
    ]);
    expect(sorted(v)).toEqual({ visible: ["quad"], gated: ["lunge"] });
  });

  it("an exercise shown by another item or protocol is never held back", () => {
    const v = exerciseVisibility([
      protocol([item("squat", { hiddenFromPatient: true, startWeek: 8 })]),
      protocol([item("squat")]),
    ]);
    expect(sorted(v)).toEqual({ visible: ["squat"], gated: [] });
  });

  it("respects the released week and an unpaid package", () => {
    expect(sorted(exerciseVisibility([
      protocol([item("a"), item("b", { startWeek: 3 })], { releasedThroughWeek: 2 }),
    ]))).toEqual({ visible: ["a"], gated: ["b"] });

    expect(sorted(exerciseVisibility([
      protocol([item("a"), item("b")], { packages: [{ isPaid: false }] }),
    ]))).toEqual({ visible: [], gated: ["a", "b"] });
  });
});

describe("protocolExerciseVisibility", () => {
  it("reads only the patient's sent protocols, with the latest package", async () => {
    (prisma as any).treatmentProtocol.findMany.mockResolvedValue([protocol([item("x", { hiddenFromPatient: true })])]);
    expect(sorted(await protocolExerciseVisibility("p1"))).toEqual({ visible: [], gated: ["x"] });
    const args = (prisma as any).treatmentProtocol.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ patientId: "p1", status: "SENT_TO_PATIENT" });
    expect(args.select.packages).toMatchObject({ orderBy: { createdAt: "desc" }, take: 1 });
  });
});

describe("visiblePrescriptionWhere", () => {
  it("shows a plan's prescription only while the plan shows that exercise", () => {
    expect(visiblePrescriptionWhere({ visible: ["quad"], gated: ["lunge"] })).toEqual({
      OR: [
        { protocolId: null, exerciseId: { notIn: ["lunge"] } },
        { protocolId: { not: null }, exerciseId: { in: ["quad"] } },
      ],
    });
  });

  it("with the plan archived (nothing sent), no plan prescription is left and standalone ones stay", () => {
    expect(visiblePrescriptionWhere({ visible: [], gated: [] })).toEqual({
      OR: [
        { protocolId: null },
        { protocolId: { not: null }, exerciseId: { in: [] } },
      ],
    });
  });

  it("builds the same filter straight from the patient id", async () => {
    (prisma as any).treatmentProtocol.findMany.mockResolvedValue([
      protocol([item("quad"), item("lunge", { hiddenFromPatient: true, startWeek: 6 })]),
    ]);
    expect(await patientPrescriptionWhere("p1")).toEqual({
      OR: [
        { protocolId: null, exerciseId: { notIn: ["lunge"] } },
        { protocolId: { not: null }, exerciseId: { in: ["quad"] } },
      ],
    });
  });
});
