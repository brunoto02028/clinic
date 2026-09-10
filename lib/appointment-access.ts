import { prisma } from "@/lib/db";

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
