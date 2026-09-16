import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { resolveActorTenant } from "@/lib/actor-tenant";

/**
 * The clinic whose library a caller is working in. Every route that reads or
 * writes folders or exercises resolves it the same way — a route that reads
 * with one rule and writes with another lets the UI list categories it then
 * cannot create folders under.
 *
 * Since activity 46 this is the same rule as patients and protocols: a
 * SUPERADMIN works in the clinic selected in "Active Clinic" (own clinic when
 * none is selected), everyone else in their own. It used to fall back to
 * whichever clinic came first in the table, which could point the library at
 * another tenant's exercises.
 */
export async function resolveClinicId(session: any): Promise<string | null> {
  const role = (session?.user as any)?.role;
  const ownClinicId = (session?.user as any)?.clinicId ?? null;
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
  return resolveActorTenant(role, ownClinicId, selected);
}

/**
 * Exercises live in folders, never loose and never directly in a category.
 * Both upload paths (single and bulk) check this the same way so the rule can't
 * drift between them — loose videos are exactly what the library reorganisation
 * set out to remove.
 */
export type FolderCheck = { ok: true } | { ok: false; error: string; status: number };

export async function assertValidExerciseFolder(
  folderId: string | null | undefined,
  clinicId: string
): Promise<FolderCheck> {
  if (!folderId) {
    return { ok: false, error: "An exercise must belong to a folder", status: 400 };
  }

  const folder = await prisma.exerciseFolder.findUnique({
    where: { id: folderId },
    select: { id: true, clinicId: true, parentId: true },
  });

  if (!folder || folder.clinicId !== clinicId) {
    return { ok: false, error: "Folder not found", status: 400 };
  }

  if (!folder.parentId) {
    return {
      ok: false,
      error: "Videos go in a folder, not directly in a category",
      status: 400,
    };
  }

  return { ok: true };
}
