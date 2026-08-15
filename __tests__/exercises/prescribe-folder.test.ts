/**
 * @jest-environment node
 *
 * Handing a patient a folder used to mean prescribing its videos one at a
 * time from the library, on another screen. The folder is now resolved on the
 * server: the browser sends a folder id, not a list it assembled itself —
 * the library view is paginated, so a client-built list can quietly be a
 * partial folder and nobody would notice the missing exercises.
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
const notify = notifyPatient as jest.Mock;

function request(body: any) {
  return new Request("http://localhost/api/admin/exercise-prescriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

const exercise = (id: string) => ({
  id,
  defaultSets: 3,
  defaultReps: 12,
  defaultHoldSec: null,
  defaultRestSec: 60,
});

describe("POST /api/admin/exercise-prescriptions — whole folder", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    session.mockResolvedValue({
      user: { role: "ADMIN", clinicId: "clinic-1", id: "therapist-1" },
    });
    db.user.findFirst.mockResolvedValue({ id: "pat-1", firstName: "Gabby" });
    notify.mockResolvedValue({ channel: "EMAIL", success: true });
    db.exerciseFolder.findFirst.mockResolvedValue({ id: "f1", name: "Swimmer's Shoulder" });
    db.exerciseFolder.findMany.mockResolvedValue([]);
    db.exercise.findMany.mockResolvedValue([exercise("e1"), exercise("e2"), exercise("e3")]);
    db.exercisePrescription.findMany.mockResolvedValue([]);
    db.$transaction.mockImplementation((ops: any[]) => Promise.resolve(ops.map((_, i) => ({ id: `p${i}` }))));
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it("prescribes every active exercise in the folder in one call", async () => {
    const res = await POST(request({ patientId: "pat-1", folderId: "f1" }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.count).toBe(3);
    expect(body.folderName).toBe("Swimmer's Shoulder");
  });

  it("carries each exercise's own defaults instead of blank prescriptions", async () => {
    await POST(request({ patientId: "pat-1", folderId: "f1" }));

    const created = db.exercisePrescription.create.mock.calls.map((c: any[]) => c[0].data);
    expect(created).toHaveLength(3);
    expect(created[0]).toMatchObject({ sets: 3, reps: 12, restSeconds: 60 });
  });

  it("reaches into a category's child folders, not just its own videos", async () => {
    db.exerciseFolder.findMany.mockResolvedValue([{ id: "child-a" }, { id: "child-b" }]);

    await POST(request({ patientId: "pat-1", folderId: "cat-1" }));

    const where = db.exercise.findMany.mock.calls[0][0].where;
    expect(where.folderId.in).toEqual(["f1", "child-a", "child-b"]);
  });

  it("only ever looks at folders and exercises of the caller's clinic", async () => {
    await POST(request({ patientId: "pat-1", folderId: "f1" }));

    expect(db.exerciseFolder.findFirst.mock.calls[0][0].where).toMatchObject({ clinicId: "clinic-1" });
    expect(db.exercise.findMany.mock.calls[0][0].where).toMatchObject({ clinicId: "clinic-1", isActive: true });
  });

  it("refuses a folder id belonging to another clinic", async () => {
    db.exerciseFolder.findFirst.mockResolvedValue(null);

    const res = await POST(request({ patientId: "pat-1", folderId: "someone-elses" }));

    expect(res.status).toBe(404);
    expect(db.exercisePrescription.create).not.toHaveBeenCalled();
  });

  it("does not duplicate what the patient already has", async () => {
    db.exercisePrescription.findMany.mockResolvedValue([{ exerciseId: "e2" }]);

    const res = await POST(request({ patientId: "pat-1", folderId: "f1" }));
    const body = await res.json();

    expect(body.count).toBe(2);
    expect(body.skipped).toBe(1);
  });

  it("reports an empty folder instead of silently doing nothing", async () => {
    db.exercise.findMany.mockResolvedValue([]);

    const res = await POST(request({ patientId: "pat-1", folderId: "f1" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("Swimmer's Shoulder");
  });

  it("still accepts an explicit exercise list", async () => {
    const res = await POST(
      request({ patientId: "pat-1", exercises: [{ exerciseId: "e9", sets: 4 }] })
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.count).toBe(1);
    expect(db.exerciseFolder.findFirst).not.toHaveBeenCalled();
  });

  it("notifies the patient once for the whole folder, not once per exercise", async () => {
    await POST(request({ patientId: "pat-1", folderId: "f1" }));

    expect(notify).toHaveBeenCalledTimes(1);
    const arg = notify.mock.calls[0][0];
    expect(arg.patientId).toBe("pat-1");
    expect(arg.emailTemplateSlug).toBe("EXERCISES_PRESCRIBED");
    expect(arg.emailVars).toMatchObject({ exerciseCount: "3", programmeName: "Swimmer's Shoulder" });
  });

  it("counts only what was actually prescribed, not what was skipped", async () => {
    db.exercisePrescription.findMany.mockResolvedValue([{ exerciseId: "e2" }]);

    await POST(request({ patientId: "pat-1", folderId: "f1" }));

    expect(notify.mock.calls[0][0].emailVars.exerciseCount).toBe("2");
  });

  it("stays silent when everything was already prescribed", async () => {
    db.exercisePrescription.findMany.mockResolvedValue([
      { exerciseId: "e1" }, { exerciseId: "e2" }, { exerciseId: "e3" },
    ]);

    const res = await POST(request({ patientId: "pat-1", folderId: "f1" }));

    expect(res.status).toBe(200);
    expect(notify).not.toHaveBeenCalled();
  });

  it("keeps the prescriptions when the notification fails", async () => {
    notify.mockRejectedValue(new Error("WhatsApp down"));

    const res = await POST(request({ patientId: "pat-1", folderId: "f1" }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.count).toBe(3);
  });

  it("carries a message for both languages", async () => {
    await POST(request({ patientId: "pat-1", folderId: "f1" }));

    const arg = notify.mock.calls[0][0];
    expect(arg.plainMessage).toContain("3 new exercises");
    expect(arg.plainMessagePt).toContain("3 novos exercícios");
  });

  it("rejects a caller who is not staff", async () => {
    session.mockResolvedValue({ user: { role: "PATIENT", clinicId: "clinic-1", id: "pat-1" } });

    const res = await POST(request({ patientId: "pat-1", folderId: "f1" }));

    expect(res.status).toBe(401);
  });
});
