/**
 * @jest-environment node
 *
 * POST /api/admin/protocols/[id]/assign (activity 45): the patient and the
 * template must both be the caller's clinic's, a second copy of the same
 * template needs an explicit choice, and later weeks start hidden.
 */

jest.mock("@/lib/db", () => {
  const tx = {
    treatmentProtocol: { create: jest.fn(), updateMany: jest.fn() },
    exercisePrescription: { findFirst: jest.fn(), create: jest.fn() },
  };
  return {
    prisma: {
      user: { findUnique: jest.fn() },
      treatmentProtocol: { findMany: jest.fn() },
      $transaction: jest.fn((fn: any) => fn(tx)),
      __tx: tx,
    },
  };
});
jest.mock("@/lib/notify-patient", () => ({ notifyPatient: jest.fn() }));
jest.mock("@/lib/staff-patient-access", () => ({ staffPatientAccess: jest.fn() }));
jest.mock("@/lib/protocol-template-access", () => ({
  TEMPLATE_NOT_FOUND: { error: "Template not found" },
  templateInTenant: jest.fn(),
  mapExercisesToClinic: jest.fn(),
}));

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notifyPatient } from "@/lib/notify-patient";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import { templateInTenant, mapExercisesToClinic } from "@/lib/protocol-template-access";
import { POST } from "@/app/api/admin/protocols/[id]/assign/route";

const db = prisma as any;
const tx = db.__tx;
const accessMock = staffPatientAccess as jest.Mock;
const templateMock = templateInTenant as jest.Mock;
const mapMock = mapExercisesToClinic as jest.Mock;

const actor = { userId: "therapist1", role: "THERAPIST", clinicId: "clinicA", isImpersonating: false };

const item = (over: Record<string, any>) => ({
  phase: "SHORT_TERM",
  itemType: "HOME_EXERCISE",
  sortOrder: 0,
  title: "Item",
  titlePt: "Item PT",
  description: null,
  descriptionPt: null,
  instructions: null,
  instructionsPt: null,
  exerciseId: null,
  startWeek: 1,
  endWeek: null,
  ...over,
});

const template = {
  id: "tpl1",
  clinicId: "clinicA",
  name: "ACL rehab",
  namePt: "Reabilitação LCA",
  description: "Post-op plan",
  descriptionPt: "Plano pós-op",
  referencesJson: null,
  estimatedWeeks: 39,
  sessionsPerWeek: 2,
  items: [
    item({ title: "Quad sets", titlePt: "Isométrico de quadríceps", exerciseId: "own-ex", startWeek: 1 }),
    item({ title: "Heel slides", exerciseId: "foreign-ex", startWeek: 2 }),
    item({ title: "Wall squat", exerciseId: "orphan-ex", startWeek: 3 }),
    item({ title: "Clinic session", itemType: "IN_CLINIC", startWeek: 5 }),
    item({ title: "Quad sets again", exerciseId: "own-ex", startWeek: 6 }),
  ],
};

const call = (body: unknown, id = "tpl1") =>
  POST(
    new NextRequest("http://localhost/api/admin/protocols/tpl1/assign", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    { params: { id } }
  );

const createdItems = () => tx.treatmentProtocol.create.mock.calls[0][0].data.items.create;

beforeEach(() => {
  jest.clearAllMocks();
  accessMock.mockResolvedValue({ actor });
  templateMock.mockResolvedValue(template);
  mapMock.mockResolvedValue(new Map([["own-ex", "own-ex"], ["foreign-ex", "our-ex"], ["orphan-ex", null]]));
  db.user.findUnique.mockResolvedValue({ id: "p1", preferredLocale: "en-GB" });
  db.treatmentProtocol.findMany.mockResolvedValue([]);
  tx.treatmentProtocol.create.mockResolvedValue({ id: "proto1" });
  tx.treatmentProtocol.updateMany.mockResolvedValue({ count: 1 });
  tx.exercisePrescription.findFirst.mockResolvedValue(null);
  tx.exercisePrescription.create.mockResolvedValue({});
});

describe("input validation", () => {
  it.each([
    ["no body", "not json"],
    ["no patientId", {}],
    ["numeric patientId", { patientId: 5 }],
    ["zero weeks", { patientId: "p1", visibleThroughWeek: 0 }],
    ["fractional weeks", { patientId: "p1", visibleThroughWeek: 1.5 }],
    ["weeks as text", { patientId: "p1", visibleThroughWeek: "2" }],
    ["unknown onExisting", { patientId: "p1", onExisting: "replace" }],
  ])("rejects %s with 400 before touching anything", async (_label, body) => {
    const res = await call(body);
    expect(res.status).toBe(400);
    expect(accessMock).not.toHaveBeenCalled();
    expect(tx.treatmentProtocol.create).not.toHaveBeenCalled();
  });
});

describe("tenant checks", () => {
  it("passes through the patient guard's answer (another clinic's patient)", async () => {
    accessMock.mockResolvedValue({ response: NextResponse.json({ error: "Patient not found" }, { status: 404 }) });
    const res = await call({ patientId: "p-other" });
    expect(res.status).toBe(404);
    expect(templateMock).not.toHaveBeenCalled();
    expect(tx.treatmentProtocol.create).not.toHaveBeenCalled();
    expect(notifyPatient).not.toHaveBeenCalled();
  });

  it("answers 404 for a template outside the caller's clinic", async () => {
    templateMock.mockResolvedValue(null);
    const res = await call({ patientId: "p1" }, "tpl-other");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Template not found" });
    expect(templateMock).toHaveBeenCalledWith("tpl-other", "clinicA", expect.anything());
    expect(tx.treatmentProtocol.create).not.toHaveBeenCalled();
    expect(notifyPatient).not.toHaveBeenCalled();
  });

  it("creates the protocol and prescriptions in the caller's clinic", async () => {
    const res = await call({ patientId: "p1" });
    expect(res.status).toBe(201);
    expect(tx.treatmentProtocol.create.mock.calls[0][0].data).toMatchObject({
      clinicId: "clinicA",
      patientId: "p1",
      therapistId: "therapist1",
      templateId: "tpl1",
      status: "SENT_TO_PATIENT",
    });
    for (const [args] of tx.exercisePrescription.create.mock.calls) {
      expect(args.data.clinicId).toBe("clinicA");
    }
  });
});

describe("same template twice", () => {
  const existing = [{ id: "old1", title: "ACL rehab", status: "SENT_TO_PATIENT", createdAt: new Date("2026-09-14") }];

  it("asks first: 409 with the active copies, nothing created", async () => {
    db.treatmentProtocol.findMany.mockResolvedValue(existing);
    const res = await call({ patientId: "p1" });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.existing).toHaveLength(1);
    expect(body.existing[0].id).toBe("old1");
    expect(db.treatmentProtocol.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { patientId: "p1", templateId: "tpl1", status: { not: "ARCHIVED" } } })
    );
    expect(tx.treatmentProtocol.create).not.toHaveBeenCalled();
    expect(notifyPatient).not.toHaveBeenCalled();
  });

  it('"archive" archives the old copies and assigns', async () => {
    db.treatmentProtocol.findMany.mockResolvedValue(existing);
    const res = await call({ patientId: "p1", onExisting: "archive" });
    expect(res.status).toBe(201);
    // By filter, not by the ids read before the transaction — catches a copy
    // created in between.
    expect(tx.treatmentProtocol.updateMany).toHaveBeenCalledWith({
      where: { patientId: "p1", templateId: "tpl1", status: { not: "ARCHIVED" } },
      data: { status: "ARCHIVED" },
    });
    expect(tx.treatmentProtocol.updateMany.mock.invocationCallOrder[0])
      .toBeLessThan(tx.treatmentProtocol.create.mock.invocationCallOrder[0]);
    expect((await res.json()).archived).toBe(1);
    expect(tx.treatmentProtocol.create).toHaveBeenCalledTimes(1);
  });

  it('"keep" assigns without archiving', async () => {
    db.treatmentProtocol.findMany.mockResolvedValue(existing);
    const res = await call({ patientId: "p1", onExisting: "keep" });
    expect(res.status).toBe(201);
    expect(tx.treatmentProtocol.updateMany).not.toHaveBeenCalled();
    expect((await res.json()).archived).toBe(0);
  });
});

describe("week-by-week visibility", () => {
  it("hides items starting after visibleThroughWeek", async () => {
    await call({ patientId: "p1", visibleThroughWeek: 2 });
    expect(createdItems().map((i: any) => [i.startWeek, i.hiddenFromPatient])).toEqual([
      [1, false], [2, false], [3, true], [5, true], [6, true],
    ]);
  });

  it("shows everything when visibleThroughWeek is absent or null", async () => {
    await call({ patientId: "p1" });
    expect(createdItems().every((i: any) => i.hiddenFromPatient === false)).toBe(true);
    tx.treatmentProtocol.create.mockClear();
    await call({ patientId: "p1", visibleThroughWeek: null });
    expect(createdItems().every((i: any) => i.hiddenFromPatient === false)).toBe(true);
  });
});

describe("language", () => {
  it("defaults to the patient's preferred language", async () => {
    db.user.findUnique.mockResolvedValue({ id: "p1", preferredLocale: "pt-BR" });
    const res = await call({ patientId: "p1" });
    expect((await res.json()).language).toBe("pt-BR");
    expect(tx.treatmentProtocol.create.mock.calls[0][0].data.title).toBe("Reabilitação LCA");
    expect(createdItems()[0].title).toBe("Isométrico de quadríceps");
  });

  it("uses the requested language over the patient's", async () => {
    db.user.findUnique.mockResolvedValue({ id: "p1", preferredLocale: "pt-BR" });
    const res = await call({ patientId: "p1", language: "en" });
    expect((await res.json()).language).toBe("en-GB");
    expect(tx.treatmentProtocol.create.mock.calls[0][0].data.title).toBe("ACL rehab");
  });

  it("falls back to English when the patient has no preference", async () => {
    db.user.findUnique.mockResolvedValue({ id: "p1", preferredLocale: null });
    const res = await call({ patientId: "p1" });
    expect((await res.json()).language).toBe("en-GB");
  });
});

describe("exercise links", () => {
  it("links only the clinic's exercises and reports the ones left unlinked", async () => {
    const res = await call({ patientId: "p1" });
    const body = await res.json();
    expect(mapMock).toHaveBeenCalledWith(["own-ex", "foreign-ex", "orphan-ex", null, "own-ex"], "clinicA");
    expect(createdItems().map((i: any) => i.exerciseId)).toEqual(["own-ex", "our-ex", null, null, "own-ex"]);
    expect(body.unlinkedExercises).toBe(1);
  });

  it("prescribes each linked home exercise once and skips ones already active", async () => {
    tx.exercisePrescription.findFirst.mockImplementation(({ where }: any) =>
      Promise.resolve(where.exerciseId === "our-ex" ? { id: "rx-existing" } : null)
    );
    const res = await call({ patientId: "p1" });
    const prescribed = tx.exercisePrescription.create.mock.calls.map(([a]: any) => a.data.exerciseId);
    expect(prescribed).toEqual(["own-ex"]);
    expect((await res.json()).prescriptions).toBe(1);
  });

  it("ties each prescription to the protocol it came from", async () => {
    await call({ patientId: "p1" });
    for (const [args] of tx.exercisePrescription.create.mock.calls) {
      expect(args.data.protocolId).toBe("proto1");
    }
    expect(tx.exercisePrescription.create).toHaveBeenCalled();
  });
});
