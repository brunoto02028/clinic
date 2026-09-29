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
  | { actor: Actor; porVinculo?: boolean; response?: never }
  | { actor?: never; porVinculo?: never; response: NextResponse };

/**
 * Atravessar a parede é **pedido**, nunca herdado (102 T-9).
 *
 * O vínculo de cuidado da T-3 responde uma pergunta — *este profissional pode
 * agir sobre este paciente?* — e esta guarda estava tratando o "sim" como
 * acesso ao registro inteiro. Das 43 rotas sob `/api/admin/patients/[id]/`, 22
 * não filtram por inquilino nenhum: um médico com vínculo lia `rehab-plan`,
 * `report`, `wellbeing`, `questions` e o perfil completo do paciente — e o
 * Bruno foi explícito duas vezes: *"não pode ser automaticamente liberado para
 * todo mundo, só com permissões."*
 *
 * Então a guarda **recusa** quando o acesso vem só do vínculo, e responde 404
 * como faz com qualquer registro de outro inquilino. A rota que legitimamente
 * serve um profissional intermediado pede `{ porVinculo: true }` e recebe a
 * marca de volta, para filtrar pelo que foi partilhado.
 *
 * É a escolha que falha fechada: as 43 rotas param de vazar sem que nenhuma
 * seja tocada, e a 44ª — que alguém escreve no mês que vem — nasce fechada
 * também. Marcar 22 rotas uma a uma deixaria a 23ª aberta por omissão.
 */
export interface OpcoesDeAlcance {
  /** Esta rota sabe servir quem chega por vínculo, e filtra pela partilha. */
  porVinculo?: boolean;
}

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
  notFound = "Patient not found",
  opcoes?: OpcoesDeAlcance
): Promise<Guarded> {
  const actor = await getActor(request);
  if (!actor) return unauthorized();
  if (!isStaff(actor)) return forbidden();
  try {
    const alcance = await assertPatientAccess(actor, patientId);
    if (alcance.porVinculo && !opcoes?.porVinculo) return notFoundAs(notFound);
    return { actor, porVinculo: !!alcance.porVinculo };
  } catch (err) {
    if (err instanceof AccessError) return notFoundAs(notFound);
    throw err;
  }
}

/** For routes a patient uses on their own record and staff use on their tenant's. */
export async function patientRecordAccess(
  request: NextRequest,
  patientId: string,
  notFound = "Patient not found",
  opcoes?: OpcoesDeAlcance
): Promise<Guarded> {
  const actor = await getActor(request);
  if (!actor) return unauthorized();
  try {
    const alcance = await assertPatientAccess(actor, patientId);
    // Mesma regra da guarda acima, e pela mesma razão.
    if (alcance.porVinculo && !opcoes?.porVinculo) return notFoundAs(notFound);
    return { actor, porVinculo: !!alcance.porVinculo };
  } catch (err) {
    if (err instanceof AccessError) return notFoundAs(notFound);
    throw err;
  }
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
