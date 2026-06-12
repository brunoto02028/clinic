// Shared helper to build the "DOCUMENTS" context block injected into the study
// tutor / canvas / planning prompts.
//
// IMPORTANT: the previous implementation walked the documents in order and let
// the FIRST document consume the entire character budget — which starved every
// later file (e.g. the assignment brief / marking criteria never reached the
// model). This version shares the budget FAIRLY so every uploaded document is
// represented, and orders brief/criteria first so the most important guidance
// is never the bit that gets truncated.

export interface DocLike {
  originalName: string;
  kind: string;
  extractedText: string | null;
}

const KIND_PRIORITY: Record<string, number> = {
  brief: 0,
  criteria: 1,
  reference: 2,
  notes: 3,
  other: 4,
};

export interface DocContextResult {
  context: string;
  missing: string[]; // files uploaded but with no usable extracted text
}

export function buildDocContext(documents: DocLike[], limit = 140000): DocContextResult {
  const withText = documents.filter((d) => d.extractedText && d.extractedText.trim());
  const missing = documents
    .filter((d) => !d.extractedText || !d.extractedText.trim())
    .map((d) => d.originalName);

  if (withText.length === 0) return { context: "", missing };

  // Most-important documents first (brief & criteria), so if anything is
  // truncated it's the long reference material, not the rules.
  const ordered = [...withText].sort(
    (a, b) => (KIND_PRIORITY[a.kind] ?? 5) - (KIND_PRIORITY[b.kind] ?? 5)
  );

  // Fair-share allocation: process shortest documents first, giving each an
  // equal slice of the remaining budget. Short docs are included in full and
  // their leftover budget is redistributed to the longer ones.
  const byLength = [...ordered].sort(
    (a, b) => (a.extractedText!.length) - (b.extractedText!.length)
  );
  let remaining = limit;
  let count = byLength.length;
  const take = new Map<DocLike, number>();
  for (const d of byLength) {
    const share = Math.floor(remaining / count);
    const t = Math.min(d.extractedText!.length, Math.max(share, 0));
    take.set(d, t);
    remaining -= t;
    count--;
  }

  const parts = ordered.map((d) => {
    const t = take.get(d) ?? 0;
    const text = (d.extractedText || "").slice(0, t);
    const truncated = t < (d.extractedText || "").length;
    return `--- DOCUMENT: ${d.originalName} (${d.kind})${truncated ? " [truncated to fit]" : ""} ---\n${text}`;
  });

  return {
    context: `===== DOCUMENTS (extracted full text of Bruno's uploaded files) =====\n\n${parts.join("\n\n")}\n\n===== END OF DOCUMENTS =====`,
    missing,
  };
}

// A short instruction telling the model which files failed extraction so it can
// ask Bruno to re-upload them instead of pretending they don't exist.
export function missingDocsNote(missing: string[]): string {
  if (missing.length === 0) return "";
  return `\nNOTE — these uploaded files could NOT be read (text extraction failed or empty): ${missing.join("; ")}. If any of these is the assignment brief, marking criteria or a key document, tell Bruno clearly that THAT specific file failed to import and ask him to re-upload it as a PDF or .docx (old .doc files often fail).\n`;
}
