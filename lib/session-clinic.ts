import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { resolveActorTenant } from "@/lib/actor-tenant";

/**
 * The clinic a signed-in staff member is working in, from their session —
 * the same rule as `getActor` (lib/tenant-access.ts), for routes that hold a
 * session rather than the request: their own clinic, or for a SUPERADMIN the
 * one selected in "Active Clinic".
 *
 * Returns null when none resolves. It never falls back to "whichever clinic
 * comes first in the table", as the helper this replaces did (activity 47) —
 * that handed an account without a clinic somebody else's tenant. Callers
 * must refuse the request instead of querying with a null clinic.
 */
export async function sessionClinicId(session: any): Promise<string | null> {
  const role = (session?.user as any)?.role as string | undefined;
  let ownClinicId = ((session?.user as any)?.clinicId as string | undefined) ?? null;

  // A session minted before the account got its clinic still says null.
  if (!ownClinicId) {
    const userId = (session?.user as any)?.id as string | undefined;
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } });
      ownClinicId = user?.clinicId ?? null;
    }
  }

  // Only a SUPERADMIN's clinic can come from the cookie, and cookies() throws
  // outside a request (scripts, tests) — everyone else skips it.
  let selected: string | undefined;
  if (role === "SUPERADMIN") {
    try {
      selected = cookies().get("selected-clinic-id")?.value;
    } catch {
      selected = undefined;
    }
  }

  return resolveActorTenant(role || "", ownClinicId, selected);
}

/** No clinic resolved — the caller can't act on any tenant's data. */
export const NO_CLINIC = { error: "No clinic resolved for this account" };
