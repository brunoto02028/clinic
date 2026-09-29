import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { vinculoVivo } from "@/lib/care-link";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { resolveActorTenant } from "@/lib/actor-tenant";

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

/** The authenticated actor (web session or app bearer, impersonation applied), or null. */
export async function getActor(request: NextRequest): Promise<Actor | null> {
  const effective = await getEffectiveUser();
  if (!effective) return null;

  const user = await prisma.user.findUnique({
    where: { id: effective.userId },
    select: { id: true, role: true, clinicId: true, isActive: true },
  });
  if (!user || !user.isActive) return null;

  const clinicId = await resolveActorTenant(
    user.role,
    user.clinicId,
    request.cookies.get("selected-clinic-id")?.value
  );

  return {
    userId: user.id,
    role: user.role as ActorRole,
    clinicId,
    isImpersonating: effective.isImpersonating,
  };
}

/**
 * The signed-in staff member themself, ignoring "View as Patient" — for
 * staff-only routes NOT under /api/admin, where the middleware swaps the
 * identity headers for the impersonated patient's (getActor would answer as
 * that patient and lock the admin out of their own lists).
 */
export async function getSessionStaffActor(request: NextRequest): Promise<Actor | null> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, clinicId: true, isActive: true },
  });
  if (!user || !user.isActive || !isStaff({ role: user.role } as Actor)) return null;

  const clinicId = await resolveActorTenant(
    user.role,
    user.clinicId,
    request.cookies.get("selected-clinic-id")?.value
  );

  return { userId: user.id, role: user.role as ActorRole, clinicId, isImpersonating: false };
}

/**
 * The platform owner (SUPERADMIN) themself, or null — for anything that writes
 * BPR/platform-wide state (the site, consent texts, global prices, the
 * platform Stripe account): a tenant's ADMIN must not reach those (activity
 * 52, T-2). Role re-read from the database, impersonation ignored.
 */
export async function getSuperadminActor(request: NextRequest): Promise<Actor | null> {
  const actor = await getSessionStaffActor(request);
  return actor?.role === "SUPERADMIN" ? actor : null;
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

/**
 * Resolves a patient the actor may act on: themself, a patient of the staff
 * member's tenant — **or**, since 102 T-3, a patient bound to them by a live
 * care link.
 *
 * ## Por que o vínculo entra **aqui**, e não numa rota
 *
 * Esta é a única função que responde "posso agir sobre este paciente?". Os dois
 * vazamentos de 28/09/2026 aconteceram porque rotas responderam sozinhas — o id
 * veio do corpo, o inquilino veio da sessão, e ninguém conferiu que os dois
 * combinavam.
 *
 * A 102 abre uma porta entre inquilinos de propósito. Ela cabe nesta função, e
 * em nenhuma outra: assim a porta é uma, auditável, e quem a atravessa passa
 * pelo mesmo `404` de sempre quando não devia.
 *
 * **O vínculo não abre prontuário.** Ele responde só a pergunta desta função; o
 * que se vê do paciente é decidido item a item na partilha (T-9).
 */
export async function assertPatientAccess(
  actor: Actor,
  patientId: string
): Promise<{ id: string; clinicId: string | null; porVinculo?: boolean }> {
  if (actor.role === "PATIENT") {
    if (patientId === actor.userId) return { id: actor.userId, clinicId: actor.clinicId };
    throw new AccessError(404, "Not found");
  }
  const patient = await prisma.user.findUnique({
    where: { id: patientId },
    select: { id: true, role: true, clinicId: true },
  });
  // A clinic-less patient (app self-registration) matches no real tenant, so
  // this answers 404 like any other unreachable id — no enumeration oracle.
  // The route tells a patient creating their own assessment that their
  // account has no clinic; that message does not belong to staff callers.
  if (!patient || patient.role !== "PATIENT" || !actor.clinicId) {
    throw new AccessError(404, "Not found");
  }

  if (patient.clinicId === actor.clinicId) {
    return { id: patient.id, clinicId: patient.clinicId };
  }

  /**
   * Fora do inquilino, só com vínculo vivo — e 404 no resto.
   *
   * A mesma frase para "não existe" e "não é seu", como sempre: distinguir as
   * duas contaria a um estranho que aquele paciente existe.
   */
  if (await vinculoVivo(patient.id, actor.clinicId)) {
    /**
     * Toda leitura atravessada fica registrada.
     *
     * Atravessar a parede é a exceção, e exceção sem registro é exceção que
     * ninguém audita. **Sem `await`**: o registro não pode atrasar nem derrubar
     * o atendimento — se o log falhar, quem perde é a auditoria, não a consulta.
     */
    void registrarAcessoPorVinculo(actor, patient.id, patient.clinicId);
    return { id: patient.id, clinicId: patient.clinicId, porVinculo: true };
  }

  throw new AccessError(404, "Not found");
}

/** Turns an AccessError into its JSON response; anything else is rethrown. */
export function accessErrorResponse(err: unknown): NextResponse {
  if (err instanceof AccessError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  throw err;
}


/**
 * O registro de uma leitura que atravessou inquilino (102 T-3).
 *
 * Fica fora de `assertPatientAccess` para deixar claro que é efeito colateral,
 * e para que o `catch` engula tudo: uma falha de auditoria não pode virar uma
 * falha de atendimento.
 */
async function registrarAcessoPorVinculo(
  actor: Actor,
  patientId: string,
  patientClinicId: string | null
): Promise<void> {
  try {
    const { logAudit } = await import("@/lib/system-logger");
    await logAudit({
      userId: actor.userId,
      userEmail: "",
      userRole: String(actor.role),
      action: "CARE_LINK_ACCESS",
      entity: "User",
      entityId: patientId,
      description: "Professional reached a patient through a care link",
      metadata: {
        professionalClinicId: actor.clinicId,
        patientClinicId,
      },
    });
  } catch {
    /* auditoria nunca derruba atendimento */
  }
}
