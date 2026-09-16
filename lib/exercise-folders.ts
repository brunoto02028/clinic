import { prisma } from "@/lib/db";
import { sessionClinicId } from "@/lib/session-clinic";

/**
 * The clinic whose library a caller is working in — the one helper every
 * route that reads or writes folders or exercises uses, so reads and writes
 * can't drift apart (the UI listing categories it then cannot create folders
 * under). Same rule as patients and protocols since activity 46; kept here as
 * an alias so the library routes read naturally.
 */
export const resolveClinicId = sessionClinicId;

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
