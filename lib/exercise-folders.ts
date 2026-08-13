import { prisma } from "@/lib/db";

/**
 * A SUPERADMIN in "Global View" has no clinicId on the session. Every route
 * that reads or writes folders resolves it the same way — a route that reads
 * with one rule and writes with another lets the UI list categories it then
 * cannot create folders under.
 */
export async function resolveClinicId(session: any): Promise<string | null> {
  const fromSession = (session?.user as any)?.clinicId;
  if (fromSession) return fromSession;
  const anyClinic = await prisma.clinic.findFirst({ select: { id: true } });
  return anyClinic?.id || null;
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
