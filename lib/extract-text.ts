// Text extraction for study documents.
// Supports: plain text/markdown/csv, DOCX (via adm-zip), PDF (via pdf-parse).
// Images are handled separately by the route using AI vision OCR.

import AdmZip from "adm-zip";

const MAX_CHARS = 60000; // cap stored text to keep prompts manageable

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

/** Extract text from a PDF buffer using pdf-parse v2 (lazy import). */
async function extractPdf(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text || "";
  } finally {
    await parser.destroy().catch(() => {});
  }
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
  return null;
}
