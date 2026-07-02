// Text extraction for study documents.
// Supports: plain text/markdown/csv, DOCX (via adm-zip), PDF (via pdf-parse).
// Images are handled separately by the route using AI vision OCR.

import AdmZip from "adm-zip";

const MAX_CHARS = 200000; // cap stored text (generous; Claude has a large context window)

export function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

export function isTextMime(mime: string, name: string): boolean {
  if (mime.startsWith("text/")) return true;
  if (mime === "application/json") return true;
  return /\.(txt|md|markdown|csv|rtf)$/i.test(name);
}

export function isDocxMime(mime: string, name: string): boolean {
  return (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    /\.docx$/i.test(name)
  );
}

export function isPdfMime(mime: string, name: string): boolean {
  return mime === "application/pdf" || /\.pdf$/i.test(name);
}

export function isLegacyDocMime(mime: string, name: string): boolean {
  // Old binary Word format (.doc) — NOT the modern .docx (handled separately).
  return (
    (mime === "application/msword" || /\.doc$/i.test(name)) &&
    !/\.docx$/i.test(name)
  );
}

/**
 * Best-effort text recovery from a legacy binary .doc (OLE compound) file.
 * We cannot fully parse the format without a heavy dependency, so we pull out
 * runs of readable characters. For mostly-text documents (briefs, marking
 * sheets) this recovers the bulk of the visible content. Tries both UTF-16LE
 * and Latin1 and keeps whichever yields more readable text.
 */
function extractLegacyDoc(buffer: Buffer): string {
  const printableRuns = (s: string): string => {
    const matches = s.match(/[\x20-\x7E\u00A0-\u024F\n\r\t]{4,}/g) || [];
    return matches
      .map((r) => r.replace(/[ \t]{2,}/g, " ").trim())
      .filter((r) => /[A-Za-z]{2,}/.test(r)) // keep runs with actual words
      .join("\n");
  };
  const utf16 = printableRuns(buffer.toString("utf16le"));
  const latin1 = printableRuns(buffer.toString("latin1"));
  return (utf16.length >= latin1.length ? utf16 : latin1);
}

/** Extract readable text from a DOCX buffer without external services. */
function extractDocx(buffer: Buffer): string {
  const zip = new AdmZip(buffer);
  const entry = zip.getEntry("word/document.xml");
  if (!entry) return "";
  const xml = entry.getData().toString("utf8");
  // Convert paragraph/line breaks to newlines, then strip remaining tags.
  const withBreaks = xml
    .replace(/<\/w:p>/g, "\n")
    .replace(/<w:br\s*\/?>/g, "\n")
    .replace(/<w:tab\s*\/?>/g, "\t");
  const text = withBreaks
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return text;
}

/** Extract text from a PDF buffer using pdf-parse v1 (lazy import).
 * Imports the internal lib file directly to skip pdf-parse's index.js debug
 * block (which tries to read a sample PDF and breaks in bundled/server runtimes). */
async function extractPdf(buffer: Buffer): Promise<string> {
  const mod: any = await import("pdf-parse/lib/pdf-parse.js");
  const pdf = (mod.default || mod) as (b: Buffer) => Promise<{ text: string }>;
  const data = await pdf(buffer);
  return data.text || "";
}

function clean(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
    .slice(0, MAX_CHARS);
}

/**
 * Extract text from a non-image document buffer.
 * Returns null for unsupported types (caller should fall back to vision OCR or skip).
 */
export async function extractDocumentText(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<string | null> {
  if (isTextMime(mimeType, fileName)) {
    return clean(buffer.toString("utf8"));
  }
  if (isDocxMime(mimeType, fileName)) {
    return clean(extractDocx(buffer));
  }
  if (isPdfMime(mimeType, fileName)) {
    return clean(await extractPdf(buffer));
  }
  if (isLegacyDocMime(mimeType, fileName)) {
    return clean(extractLegacyDoc(buffer));
  }
  return null;
}
