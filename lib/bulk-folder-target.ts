// lib/bulk-folder-target.ts — where a bulk-uploaded video is filed.
//
// Three inputs decide it, and getting it wrong files the video nowhere, which
// is exactly what reads as "the upload went to the wrong place". Kept pure and
// out of the page so it can be tested.

export interface BulkFolderInputs {
  /** Name of the OS subfolder the file came from, if any. Wins over everything
   *  else: dragging a folder in should preserve its structure. */
  fileFolder?: string | null;
  /** Id of an existing exercise folder the user picked, or null when they chose
   *  to create a new one. */
  pickedFolderId?: string | null;
  /** Name typed for a folder to be created, used when nothing was picked. */
  fallbackFolderName?: string | null;
  /** Names resolved to ids by the get-or-create step before upload. */
  folderNameToId: Record<string, string>;
}

/** The folder id to file this video under, or null when there is none — which
 *  the caller must treat as a failure rather than uploading anyway. */
export function resolveBulkFolderId({
  fileFolder,
  pickedFolderId,
  fallbackFolderName,
  folderNameToId,
}: BulkFolderInputs): string | null {
  const own = fileFolder?.trim();
  if (own) return folderNameToId[own] ?? null;
  if (pickedFolderId) return pickedFolderId;
  const fallback = fallbackFolderName?.trim();
  if (fallback) return folderNameToId[fallback] ?? null;
  return null;
}

/** The distinct folder names that have to exist before uploading. A picked
 *  folder already exists, so it contributes nothing to create. */
export function folderNamesToEnsure(
  files: Array<{ folder?: string | null }>,
  pickedFolderId: string | null,
  fallbackFolderName: string
): string[] {
  const names = files.map((f) => {
    const own = f.folder?.trim();
    if (own) return own;
    return pickedFolderId ? "" : fallbackFolderName.trim();
  });
  return Array.from(new Set(names.filter(Boolean)));
}
