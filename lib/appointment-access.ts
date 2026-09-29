import { prisma } from "@/lib/db";
import { podeAparecerNoApp } from "@/lib/tenant-type";

const STAFF_ROLES = ["SUPERADMIN", "ADMIN", "THERAPIST"] as const;

/**
 * Appointments of one tenant. Rows written before clinicId was stored carry
 * none; they belong to their therapist's tenant, so the existing diary stays
 * visible until the backfill (activity 20, T-14) fills them in.
 */
export function appointmentTenantWhere(clinicId: string) {
  return { OR: [{ clinicId }, { clinicId: null, therapist: { clinicId } }] };
}

/**
 * An active staff member of the tenant. `bookableOnly` is for a patient
 * choosing: only people marked as seeing patients. Staff booking on someone's
 * behalf may name any colleague, themselves included. With no id, the
 * tenant's longest-standing match.
 */
export function findTherapist(
  clinicId: string,
  therapistId: string | null | undefined,
  bookableOnly: boolean
) {
  return prisma.user.findFirst({
    where: {
      clinicId,
      isActive: true,
      role: { in: [...STAFF_ROLES] },
      ...(bookableOnly ? { bookable: true } : {}),
      ...(therapistId ? { id: therapistId } : {}),
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
}

/**
 * O profissional que este paciente pode consultar — inclusive de outro
 * inquilino (102 T-4).
 *
 * ## O que muda em relação a `findTherapist`
 *
 * `findTherapist` responde dentro do inquilino de quem chama, e é o certo para
 * a reabilitação: um terapeuta de outra clínica tem de parecer inexistente.
 *
 * A 102 acrescenta um caso: o paciente da BPR marcando com um médico que é
 * **outro inquilino**. Ele alcança aquela agenda porque o profissional está no
 * catálogo — e por nenhum outro motivo.
 *
 * ## As três condições, e todas obrigatórias
 *
 * 1. Quem pede é **paciente**. Equipe da BPR não marca com profissional de
 *    fora por aqui; quem escolhe é a pessoa.
 * 2. O profissional está **no catálogo** (`podeAparecerNoApp`) — o que exige
 *    ser profissional externo, estar ligado por alguém da BPR, e ter registro.
 * 3. Quem atende **é daquele inquilino**, atende e está ativo.
 *
 * Falhou qualquer uma, devolve `null`, e a rota responde como se o
 * profissional não existisse.
 */
export async function resolverProfissional(
  actor: { role: string; clinicId: string | null } | null,
  professionalUserId: string | null | undefined,
  bookableOnly: boolean
): Promise<{ therapistId: string; clinicId: string; timeZone?: string } | null> {
  if (!actor?.clinicId) return null;

  // Dentro de casa, nada muda.
  const daCasa = await findTherapist(actor.clinicId, professionalUserId, bookableOnly);
  if (daCasa) return { therapistId: daCasa.id, clinicId: actor.clinicId };

  // Fora de casa só com id pedido, e só para paciente.
  if (!professionalUserId || actor.role !== "PATIENT") return null;

  const pessoa = await prisma.user.findFirst({
    where: {
      id: professionalUserId,
      isActive: true,
      role: { in: [...STAFF_ROLES] },
      ...(bookableOnly ? { bookable: true } : {}),
    },
    select: {
      id: true,
      clinicId: true,
      clinic: {
        // `timezone` junto: a agenda que vale e a do fuso de quem atende.
        select: { type: true, visibleInApp: true, professionalRegistry: true, timezone: true },
      },
    },
  });
  if (!pessoa?.clinicId || !pessoa.clinic) return null;
  if (!podeAparecerNoApp(pessoa.clinic)) return null;

  return { therapistId: pessoa.id, clinicId: pessoa.clinicId, timeZone: pessoa.clinic.timezone };
}
