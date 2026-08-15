/**
 * @jest-environment node
 *
 * The library is organised for the clinic — by body region, by upload batch —
 * and a patient's programme rarely follows that shape. A therapist can file a
 * prescribed exercise under a different name for one patient without moving
 * the video or disturbing anyone else's programme.
 */

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth-options", () => ({ authOptions: {} }));
jest.mock("@/lib/notify-patient", () => ({ notifyPatient: jest.fn() }));
jest.mock("@/lib/db", () => ({
  prisma: {
    user: { findFirst: jest.fn() },
    exerciseFolder: { findFirst: jest.fn(), findMany: jest.fn() },
    exercise: { findMany: jest.fn() },
    exercisePrescription: { findMany: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { notifyPatient } from "@/lib/notify-patient";
import { POST } from "@/app/api/admin/exercise-prescriptions/route";

const session = getServerSession as jest.Mock;
const db = prisma as any;

function request(body: any) {
  return new Request("http://localhost/api/admin/exercise-prescriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

describe("displayGroup on a prescription", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    session.mockResolvedValue({ user: { role: "ADMIN", clinicId: "c1", id: "t1" } });
    db.user.findFirst.mockResolvedValue({ id: "pat-1", firstName: "Gabby" });
    db.exercisePrescription.findMany.mockResolvedValue([]);
    db.$transaction.mockImplementation((ops: any[]) => Promise.resolve(ops.map(() => ({ id: "p1" }))));
    (notifyPatient as jest.Mock).mockResolvedValue({ channel: "EMAIL", success: true });
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it("files a single exercise under the chosen group", async () => {
    await POST(request({
      patientId: "pat-1",
      exercises: [{ exerciseId: "e1" }],
      displayGroup: "Week 1 — Warm up",
    }));

    const data = db.exercisePrescription.create.mock.calls[0][0].data;
    expect(data.displayGroup).toBe("Week 1 — Warm up");
  });

  it("leaves it empty when no group was chosen, so the library folder is used", async () => {
    await POST(request({ patientId: "pat-1", exercises: [{ exerciseId: "e1" }] }));

    expect(db.exercisePrescription.create.mock.calls[0][0].data.displayGroup).toBeNull();
  });

  it("applies the group to every exercise when a whole folder is prescribed", async () => {
    db.exerciseFolder.findFirst.mockResolvedValue({ id: "f1", name: "Swimmers" });
    db.exerciseFolder.findMany.mockResolvedValue([]);
    db.exercise.findMany.mockResolvedValue([
      { id: "e1", defaultSets: null, defaultReps: null, defaultHoldSec: null, defaultRestSec: null },
      { id: "e2", defaultSets: null, defaultReps: null, defaultHoldSec: null, defaultRestSec: null },
    ]);

    await POST(request({ patientId: "pat-1", folderId: "f1", displayGroup: "Phase 2" }));

    const groups = db.exercisePrescription.create.mock.calls.map((c: any[]) => c[0].data.displayGroup);
    expect(groups).toEqual(["Phase 2", "Phase 2"]);
  });

  it("does not let the group leak into an exercise prescribed without one", async () => {
    await POST(request({
      patientId: "pat-1",
      exercises: [{ exerciseId: "e1", displayGroup: "Knee" }, { exerciseId: "e2" }],
    }));

    const groups = db.exercisePrescription.create.mock.calls.map((c: any[]) => c[0].data.displayGroup);
    expect(groups).toEqual(["Knee", null]);
  });
});
