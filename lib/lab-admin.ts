import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionStaffActor, type Actor } from "@/lib/tenant-access";
import { logAudit } from "@/lib/system-logger";

/**
 * O que as rotas do painel de exames têm em comum (081, T-2).
 *
 * Tudo aqui é sob o tenant do actor — `getSessionStaffActor`, nunca
 * `session.user.clinicId`, que foi a família de rotas que vazou entre clínicas.
 */

export async function labStaff(request: NextRequest): Promise<
  { actor: Actor & { clinicId: string } } | { response: NextResponse }
> {
  const actor = await getSessionStaffActor(request);
  if (!actor) return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  // Staff sem clínica não é "staff de todas": sem tenant não há o que listar.
  if (!actor.clinicId) return { response: NextResponse.json({ error: "No clinic" }, { status: 403 }) };
  return { actor: actor as Actor & { clinicId: string } };
}

/** Só quem é dono decide preço. Um terapeuta vê, não precifica. */
export function canSetPrices(actor: Actor): boolean {
  return actor.role === "SUPERADMIN" || actor.role === "ADMIN";
}

/**
 * Quem fez, para a auditoria. A 080 gravou `userEmail: ""` fixo e o QA
 * apontou; aqui o e-mail é lido, não presumido.
 */
export async function staffForAudit(userId: string) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, firstName: true, lastName: true },
  });
  return {
    userId,
    userEmail: u?.email ?? "",
    userRole: u?.role ?? "",
    userName: u ? `${u.firstName} ${u.lastName}`.trim() : undefined,
  };
}

export async function auditLab(userId: string, action: string, entity: string, entityId: string, description: string, metadata?: unknown) {
  const who = await staffForAudit(userId);
  await logAudit({ ...who, action, entity, entityId, description, metadata });
}

/**
 * Resultados esperando liberação — **sempre zero desde 26/09/2026**.
 *
 * O resultado passou a sair direto para a pessoa, então não existe fila: a
 * clínica não tem nada a liberar. A função sobrevive porque o painel de espera
 * tem sete contadores e removê-la mexeria no formato que várias telas leem; ela
 * devolve zero sem ir ao banco, que é a resposta certa e não custa consulta.
 *
 * Quando existir o compartilhamento iniciado pela pessoa, o que vai contar aqui
 * é outra coisa: resultados que **ela** mandou para a clínica ler.
 */
export async function labResultsAwaitingRelease(_clinicId: string): Promise<number> {
  return 0;
}

/** O pedido com tudo que a tela de liberação precisa. */
export function labOrderInclude() {
  return {
    patient: { select: { id: true, firstName: true, lastName: true, email: true, preferredLocale: true } },
    items: { include: { product: { select: { id: true, name: true, lmlProductId: true, biomarkers: true } } } },
    registrations: { include: { values: { orderBy: { biomarker: "asc" as const } } }, orderBy: { createdAt: "asc" as const } },
    events: { orderBy: { createdAt: "desc" as const } },
  };
}

/**
 * Os valores anteriores dos mesmos biomarcadores, deste paciente, para a tela
 * de liberação mostrar a linha do tempo. É onde o valor compõe: a terceira
 * ferritina vale mais que a primeira. Só resultados **liberados** — um valor
 * que a clínica ainda não olhou não vira histórico.
 */
export async function previousValuesFor(clinicId: string, patientId: string, excludeOrderId: string, biomarkers: string[]) {
  if (biomarkers.length === 0) return [];
  return (prisma as any).labResultValue.findMany({
    where: {
      biomarker: { in: biomarkers },
      registration: {
        order: { clinicId, patientId, id: { not: excludeOrderId }, releasedToPatientAt: { not: null } },
      },
    },
    select: {
      biomarker: true, value: true, valueText: true, unit: true, minRange: true, maxRange: true, outOfRange: true, measuredAt: true, createdAt: true,
      registration: { select: { order: { select: { id: true, orderNumber: true, releasedToPatientAt: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
}
