import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { getDefaultClinicId } from "@/lib/default-tenant";

// Single point of tenant access control. Role and tenant are re-read from the
// database on every call — a token minted before a role or clinic change must
// not keep its old reach (the rule app/api/foot-scans/[id] already followed).
// Everything fails closed: no resolved tenant means no access, never "the
// first clinic in the table".

export type ActorRole = "SUPERADMIN" | "ADMIN" | "THERAPIST" | "PATIENT";

export interface Actor {
  userId: string;
  role: ActorRole;
  /** The tenant the actor works in. SUPERADMIN: the selected clinic, else the default tenant. */
  clinicId: string | null;
  isImpersonating: boolean;
}

export class AccessError extends Error {
  constructor(public status: 401 | 403 | 404 | 409, message: string) {
    super(message);
  }
}

const STAFF_ROLES: ActorRole[] = ["SUPERADMIN", "ADMIN", "THERAPIST"];

export function isStaff(actor: Actor): boolean {
  return STAFF_ROLES.includes(actor.role);
}

// The switch-clinic cookie is set from a request body, so it is only trusted
// when it names a clinic that exists and is active. With no clinic selected
// ("All clinics"), the owner works in their own clinic: a platform-wide view
// belongs to the SUPERADMIN screens, not to tenant-scoped data routes.
async function resolveSuperadminClinic(
  selected: string | undefined,
  ownClinicId: string | null
): Promise<string | null> {
  if (selected) {
    const clinic = await prisma.clinic.findUnique({
      where: { id: selected },
      select: { id: true, isActive: true },
    });
    if (clinic?.isActive) return clinic.id;
  }
  return ownClinicId ?? getDefaultClinicId();
}

/** The authenticated actor (web session or app bearer, impersonation applied), or null. */
export async function getActor(request: NextRequest): Promise<Actor | null> {
  const effective = await getEffectiveUser();
  if (!effective) return null;

  const user = await prisma.user.findUnique({
    where: { id: effective.userId },
    select: { id: true, role: true, clinicId: true, isActive: true },
  });
  if (!user || !user.isActive) return null;

  const clinicId =
    user.role === "SUPERADMIN"
      ? await resolveSuperadminClinic(request.cookies.get("selected-clinic-id")?.value, user.clinicId)
      : user.clinicId;

  return {
    userId: user.id,
    role: user.role as ActorRole,
    clinicId,
    isImpersonating: effective.isImpersonating,
  };
}

export function requireStaff(actor: Actor): void {
  if (!isStaff(actor)) throw new AccessError(403, "Forbidden");
}

/** Where-clause fragment scoping a query to the actor's tenant. */
export function tenantWhere(actor: Actor): { clinicId: string } {
  if (!actor.clinicId) throw new AccessError(403, "No tenant resolved for this account");
  return { clinicId: actor.clinicId };
}

/**
 * A record is within reach when the patient owns it, or a staff member works
 * in its tenant. Anything else answers 404, so another tenant's records don't
 * reveal they exist. Pass the record's tenant; for rows written before
 * clinicId was stored, the caller resolves the patient's tenant first.
 */
export function canAccessRecord(
  actor: Actor,
  record: { clinicId: string | null; patientId?: string | null }
): boolean {
  if (actor.role === "PATIENT") return !!record.patientId && record.patientId === actor.userId;
  return !!actor.clinicId && record.clinicId === actor.clinicId;
}

/** Throwing form of canAccessRecord, for routes built around AccessError. */
export function assertRecordAccess(
  actor: Actor,
  record: { clinicId: string | null; patientId?: string | null }
): void {
  if (!canAccessRecord(actor, record)) throw new AccessError(404, "Not found");
}

/** Staff-only access to a tenant-owned resource (a user, a setting, a template). */
export function assertClinicAccess(actor: Actor, clinicId: string | null): void {
  if (!isStaff(actor) || !actor.clinicId || clinicId !== actor.clinicId) {
    throw new AccessError(404, "Not found");
  }
}

/** Resolves a patient the actor may act on: themself, or a patient of the staff member's tenant. */
export async function assertPatientAccess(
  actor: Actor,
  patientId: string
): Promise<{ id: string; clinicId: string | null }> {
  if (actor.role === "PATIENT") {
    if (patientId === actor.userId) return { id: actor.userId, clinicId: actor.clinicId };
    throw new AccessError(404, "Not found");
  }
  const patient = await prisma.user.findUnique({
    where: { id: patientId },
    select: { id: true, role: true, clinicId: true },
  });
  if (patient?.role === "PATIENT" && patient.clinicId === null) {
    // Accounts registered through the app still have no tenant. That is a
    // different problem from "belongs to someone else", and saying so beats
    // a 404 for a patient the staff member is looking straight at.
    throw new AccessError(409, "This patient is not linked to a clinic");
  }
  if (!patient || patient.role !== "PATIENT" || !actor.clinicId || patient.clinicId !== actor.clinicId) {
    throw new AccessError(404, "Not found");
  }
  return { id: patient.id, clinicId: patient.clinicId };
}

/** Turns an AccessError into its JSON response; anything else is rethrown. */
export function accessErrorResponse(err: unknown): NextResponse {
  if (err instanceof AccessError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  throw err;
}
