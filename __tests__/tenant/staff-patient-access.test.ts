/**
 * @jest-environment node
 *
 * Staff of one tenant could read, edit and delete another tenant's patient
 * record, clinical notes, screening and staff accounts — the ISO-1, ISO-8b and
 * ISO-9 leaks of the activity-19 audit. Every patient-record route now starts
 * with one of these guards.
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    sOAPNote: { findUnique: jest.fn() },
  },
}));
jest.mock("@/lib/get-effective-user", () => ({ getEffectiveUser: jest.fn() }));
jest.mock("@/lib/default-tenant", () => ({ getDefaultClinicId: jest.fn() }));
jest.mock("@/lib/tenant-access", () => ({
  ...jest.requireActual("@/lib/tenant-access"),
  getActor: jest.fn(),
}));

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, type Actor } from "@/lib/tenant-access";
import {
  staffPatientAccess,
  patientRecordAccess,
  soapNoteAccess,
  staffUserAccess,
  recordOfPatient,
} from "@/lib/staff-patient-access";

const users = (prisma as any).user;
const notes = (prisma as any).sOAPNote;
const actorMock = getActor as jest.Mock;
const request = new NextRequest("http://localhost/api/admin/patients/p1");

const actor = (over: Partial<Actor>): Actor => ({
  userId: "u1",
  role: "THERAPIST",
  clinicId: "clinicA",
  isImpersonating: false,
  ...over,
});

async function outcome(result: { response?: any; actor?: Actor }) {
  return result.response
    ? { status: result.response.status, body: await result.response.json() }
    : { status: "ok" as const };
}

beforeEach(() => jest.resetAllMocks());

describe("staffPatientAccess", () => {
  it("rejects an unauthenticated request and a patient", async () => {
    actorMock.mockResolvedValue(null);
    expect(await outcome(await staffPatientAccess(request, "p1"))).toMatchObject({ status: 401 });

    actorMock.mockResolvedValue(actor({ role: "PATIENT", userId: "p1" }));
    expect(await outcome(await staffPatientAccess(request, "p1"))).toMatchObject({ status: 403 });
  });

  it("answers a patient of another tenant exactly like a missing one", async () => {
    actorMock.mockResolvedValue(actor({}));

    users.findUnique.mockResolvedValue(null);
    const missing = await outcome(await staffPatientAccess(request, "nope"));

    users.findUnique.mockResolvedValue({ id: "p9", role: "PATIENT", clinicId: "clinicB" });
    const foreign = await outcome(await staffPatientAccess(request, "p9"));

    expect(missing).toEqual({ status: 404, body: { error: "Patient not found" } });
    expect(foreign).toEqual(missing);
  });

  it("carries the caller's wording for records keyed by something else", async () => {
    actorMock.mockResolvedValue(actor({}));
    users.findUnique.mockResolvedValue({ id: "p9", role: "PATIENT", clinicId: "clinicB" });

    expect(await outcome(await staffPatientAccess(request, "p9", "Screening not found"))).toEqual({
      status: 404,
      body: { error: "Screening not found" },
    });
  });

  it("lets staff of the patient's tenant through", async () => {
    const staff = actor({});
    actorMock.mockResolvedValue(staff);
    users.findUnique.mockResolvedValue({ id: "p1", role: "PATIENT", clinicId: "clinicA" });

    const result = await staffPatientAccess(request, "p1");

    expect(result.response).toBeUndefined();
    expect(result.actor).toEqual(staff);
  });
});

describe("patientRecordAccess", () => {
  it("lets the patient reach their own record and no one else's", async () => {
    actorMock.mockResolvedValue(actor({ role: "PATIENT", userId: "p1" }));
    expect(await outcome(await patientRecordAccess(request, "p1"))).toEqual({ status: "ok" });
    expect(await outcome(await patientRecordAccess(request, "p2"))).toMatchObject({ status: 404 });
  });

  it("lets staff reach a patient of their own tenant", async () => {
    actorMock.mockResolvedValue(actor({}));
    users.findUnique.mockResolvedValue({ id: "p1", role: "PATIENT", clinicId: "clinicA" });
    expect(await outcome(await patientRecordAccess(request, "p1"))).toEqual({ status: "ok" });
  });
});

describe("soapNoteAccess", () => {
  it("hides a note of another tenant behind the missing-note answer", async () => {
    actorMock.mockResolvedValue(actor({}));

    notes.findUnique.mockResolvedValue(null);
    const missing = await outcome(await soapNoteAccess(request, "n0"));

    notes.findUnique.mockResolvedValue({ clinicId: "clinicB", patientId: "p9", patient: { clinicId: "clinicB" } });
    const foreign = await outcome(await soapNoteAccess(request, "n1"));

    expect(missing).toEqual({ status: 404, body: { error: "Clinical note not found" } });
    expect(foreign).toEqual(missing);
  });

  it("falls back to the patient's tenant for notes written before clinicId was stored", async () => {
    actorMock.mockResolvedValue(actor({}));
    notes.findUnique.mockResolvedValue({ clinicId: null, patientId: "p1", patient: { clinicId: "clinicA" } });

    expect(await outcome(await soapNoteAccess(request, "n1"))).toEqual({ status: "ok" });
  });

  it("lets the note's own patient read it", async () => {
    actorMock.mockResolvedValue(actor({ role: "PATIENT", userId: "p1" }));
    notes.findUnique.mockResolvedValue({ clinicId: "clinicA", patientId: "p1", patient: { clinicId: "clinicA" } });

    expect(await outcome(await soapNoteAccess(request, "n1"))).toEqual({ status: "ok" });
  });
});

describe("staffUserAccess", () => {
  it("keeps staff inside their own tenant", async () => {
    actorMock.mockResolvedValue(actor({}));

    users.findUnique.mockResolvedValue({ clinicId: "clinicA" });
    expect(await outcome(await staffUserAccess(request, "u2"))).toEqual({ status: "ok" });

    users.findUnique.mockResolvedValue({ clinicId: "clinicB" });
    expect(await outcome(await staffUserAccess(request, "u3"))).toEqual({
      status: 404,
      body: { error: "User not found" },
    });
  });

  it("stops a non-SUPERADMIN from acting on a SUPERADMIN of the same tenant", async () => {
    actorMock.mockResolvedValue(actor({}));
    users.findUnique.mockResolvedValue({ clinicId: "clinicA", role: "SUPERADMIN" });
    expect(await outcome(await staffUserAccess(request, "owner"))).toEqual({
      status: 404,
      body: { error: "User not found" },
    });

    actorMock.mockResolvedValue(actor({ role: "SUPERADMIN" }));
    expect(await outcome(await staffUserAccess(request, "owner"))).toEqual({ status: "ok" });
  });

  it("refuses an actor with no tenant and a patient", async () => {
    actorMock.mockResolvedValue(actor({ role: "SUPERADMIN", clinicId: null }));
    users.findUnique.mockResolvedValue({ clinicId: "clinicA" });
    expect(await outcome(await staffUserAccess(request, "u2"))).toMatchObject({ status: 404 });

    actorMock.mockResolvedValue(actor({ role: "PATIENT" }));
    expect(await outcome(await staffUserAccess(request, "u2"))).toMatchObject({ status: 403 });
  });
});

describe("recordOfPatient", () => {
  const db = prisma as any;

  beforeEach(() => {
    db.sOAPNote.findFirst = jest.fn();
    db.medicalScreening = { findFirst: jest.fn() };
    db.protocolItem = { findFirst: jest.fn() };
  });

  it("looks the record up together with its owner", async () => {
    db.sOAPNote.findFirst.mockResolvedValue({ id: "n1" });

    expect(await recordOfPatient("sOAPNote", "n1", "p1")).toBe(true);
    expect(db.sOAPNote.findFirst).toHaveBeenCalledWith({
      where: { id: "n1", patientId: "p1" },
      select: { id: true },
    });
  });

  it("answers false for a record of another patient", async () => {
    db.sOAPNote.findFirst.mockResolvedValue(null);
    expect(await recordOfPatient("sOAPNote", "noteOfB", "p1")).toBe(false);
  });

  it("uses each model's own owner field", async () => {
    db.medicalScreening.findFirst.mockResolvedValue(null);
    db.protocolItem.findFirst.mockResolvedValue(null);

    await recordOfPatient("medicalScreening", "s1", "p1");
    await recordOfPatient("protocolItem", "i1", "p1");

    expect(db.medicalScreening.findFirst.mock.calls[0][0].where).toEqual({ id: "s1", userId: "p1" });
    expect(db.protocolItem.findFirst.mock.calls[0][0].where).toEqual({ id: "i1", protocol: { patientId: "p1" } });
  });

  it("rejects a missing id or an operator object without querying", async () => {
    expect(await recordOfPatient("sOAPNote", undefined, "p1")).toBe(false);
    expect(await recordOfPatient("sOAPNote", { not: "" }, "p1")).toBe(false);
    expect(db.sOAPNote.findFirst).not.toHaveBeenCalled();
  });
});
