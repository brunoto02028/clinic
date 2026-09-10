import { prisma } from "@/lib/db";
import { getDefaultClinicId } from "@/lib/default-tenant";

// The tenant an account works in. Shared by lib/tenant-access.ts and
// lib/get-effective-user.ts, which would otherwise import each other.
//
// Everyone but a SUPERADMIN works in their own clinic. For a SUPERADMIN the
// switch-clinic cookie wins — it is set from a request body, so it is only
// trusted when it names a clinic that exists and is active. With no clinic
// selected ("All clinics") the owner works in their own clinic: a
// platform-wide view belongs to the SUPERADMIN screens, not to tenant-scoped
// data routes. Last resort, the default tenant.
export async function resolveActorTenant(
  role: string,
  ownClinicId: string | null,
  selectedClinicId: string | undefined
): Promise<string | null> {
  if (role !== "SUPERADMIN") return ownClinicId;

  if (selectedClinicId) {
    const clinic = await prisma.clinic.findUnique({
      where: { id: selectedClinicId },
      select: { id: true, isActive: true },
    });
    if (clinic?.isActive) return clinic.id;
  }
  return ownClinicId ?? getDefaultClinicId();
}
