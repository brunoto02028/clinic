import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getActor,
  isStaff,
  assertPatientAccess,
  canAccessRecord,
  AccessError,
  type Actor,
} from "@/lib/tenant-access";

type Guarded =
  | { actor: Actor; response?: never }
  | { actor?: never; response: NextResponse };

const unauthorized = (): Guarded => ({
  response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
});
const forbidden = (): Guarded => ({
  response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
});
const notFoundAs = (message: string): Guarded => ({
  response: NextResponse.json({ error: message }, { status: 404 }),
});

// Records of another tenant answer exactly like missing ones, so their
// existence isn't revealed. Routes keyed by a record rather than by the
// patient pass that record's wording for "not found".

/** Every /api/admin/patients/[id]/** handler starts here: staff of that patient's tenant. */
export async function staffPatientAccess(
  request: NextRequest,
  patientId: string,
  notFound = "Patient not found"
): Promise<Guarded> {
  const actor = await getActor(request);
  if (!actor) return unauthorized();
  if (!isStaff(actor)) return forbidden();
  try {
    await assertPatientAccess(actor, patientId);
  } catch (err) {
    if (err instanceof AccessError) return notFoundAs(notFound);
    throw err;
  }
  return { actor };
}

/** For routes a patient uses on their own record and staff use on their tenant's. */
export async function patientRecordAccess(
  request: NextRequest,
  patientId: string,
  notFound = "Patient not found"
): Promise<Guarded> {
  const actor = await getActor(request);
  if (!actor) return unauthorized();
  try {
    await assertPatientAccess(actor, patientId);
  } catch (err) {
    if (err instanceof AccessError) return notFoundAs(notFound);
    throw err;
  }
  return { actor };
}

/** The note's own patient, or staff of its tenant. Notes written before
 *  clinicId was stored fall back to the patient's tenant. */
export async function soapNoteAccess(request: NextRequest, noteId: string): Promise<Guarded> {
  const actor = await getActor(request);
  if (!actor) return unauthorized();

  const note = await prisma.sOAPNote.findUnique({
    where: { id: noteId },
    select: { clinicId: true, patientId: true, patient: { select: { clinicId: true } } },
  });
  const clinicId = note?.clinicId ?? note?.patient?.clinicId ?? null;
  if (!note || !canAccessRecord(actor, { clinicId, patientId: note.patientId })) {
    return notFoundAs("Clinical note not found");
  }
  return { actor };
}

/** Staff acting on another account (staff or patient) of their own tenant. */
export async function staffUserAccess(request: NextRequest, userId: string): Promise<Guarded> {
  const actor = await getActor(request);
  if (!actor) return unauthorized();
  if (!isStaff(actor)) return forbidden();

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { clinicId: true, role: true },
  });
  if (!target || !actor.clinicId || target.clinicId !== actor.clinicId) {
    return notFoundAs("User not found");
  }
  if (target.role === "SUPERADMIN" && actor.role !== "SUPERADMIN") {
    return notFoundAs("User not found");
  }
  return { actor };
}

// Records addressed by an id from the body or query must belong to the patient
// in the URL — the one the guard already confirmed is in the actor's tenant.
// Otherwise any patient of one's own becomes a bridge into another tenant's
// records. A non-string id (e.g. a Prisma operator object) never matches.
const OWNER_FILTER = {
  medicalScreening: (patientId: string) => ({ userId: patientId }),
  sOAPNote: (patientId: string) => ({ patientId }),
  footScan: (patientId: string) => ({ patientId }),
  bodyAssessment: (patientId: string) => ({ patientId }),
  patientDocument: (patientId: string) => ({ patientId }),
  aIDiagnosis: (patientId: string) => ({ patientId }),
  treatmentProtocol: (patientId: string) => ({ patientId }),
  treatmentPackage: (patientId: string) => ({ patientId }),
  clinicalEvidenceReport: (patientId: string) => ({ patientId }),
  protocolItem: (patientId: string) => ({ protocol: { patientId } }),
};

export type PatientOwnedModel = keyof typeof OWNER_FILTER;

export async function recordOfPatient(
  model: PatientOwnedModel,
  id: unknown,
  patientId: string
): Promise<boolean> {
  if (typeof id !== "string" || !id) return false;
  const row = await (prisma as any)[model].findFirst({
    where: { id, ...OWNER_FILTER[model](patientId) },
    select: { id: true },
  });
  return row !== null;
}
