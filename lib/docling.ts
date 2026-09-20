const DOCLING_API_URL = process.env.DOCLING_API_URL || "";
const DOCLING_BASIC_AUTH_USER = process.env.DOCLING_BASIC_AUTH_USER || "";
const DOCLING_BASIC_AUTH_PASSWORD = process.env.DOCLING_BASIC_AUTH_PASSWORD || "";

function authHeaders(): Record<string, string> {
  if (!DOCLING_BASIC_AUTH_USER || !DOCLING_BASIC_AUTH_PASSWORD) return {};
  const token = Buffer.from(`${DOCLING_BASIC_AUTH_USER}:${DOCLING_BASIC_AUTH_PASSWORD}`).toString("base64");
  return { Authorization: `Basic ${token}` };
}

type ToFormat = "md" | "json" | "html" | "text" | "doctags";

// docling-serve's real contract: POST /v1/convert/file, multipart field "files",
// response shape { status, document: { md_content, text_content, json_content, html_content, doctags_content }, errors }.
async function convertFile(file: File | Blob, filename: string, toFormat: ToFormat) {
  if (!DOCLING_API_URL) throw new Error("DOCLING_API_URL not configured");

  const formData = new FormData();
  formData.append("files", file, filename);
  formData.append("to_formats", toFormat);

  const res = await fetch(`${DOCLING_API_URL}/v1/convert/file`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Docling API ${res.status}`);
  }
  if (!res.ok) throw new Error(data?.detail || data?.message || `Docling API ${res.status}`);
  if (data.status !== "success") throw new Error(data?.errors?.join("; ") || `Docling conversion failed (status: ${data.status})`);
  return data;
}

function notSupported(feature: string): never {
  throw new Error(`${feature} is not supported by the current Docling deployment (docling-serve only does document conversion).`);
}

// ── Conversion ──────────────────────────────────────

export async function convertDocument(file: File | Blob, filename: string, format: string = "markdown") {
  const toFormat: ToFormat =
    format === "json" ? "json" :
    format === "html" ? "html" :
    format === "text" ? "text" :
    "md";
  const data = await convertFile(file, filename, toFormat);
  return {
    content: data.document?.[`${toFormat}_content`],
    document: data.document,
    processing_time: data.processing_time,
  };
}

export async function convertGeneral(file: File | Blob, filename: string) {
  const data = await convertFile(file, filename, "md");
  return { content: data.document?.md_content, document: data.document, processing_time: data.processing_time };
}

// ── Extraction ──────────────────────────────────────

export async function extractText(file: File | Blob, filename: string): Promise<{ text: string }> {
  const data = await convertFile(file, filename, "md");
  return { text: data.document?.md_content || "" };
}

export async function extractTables(_file: File | Blob, _filename: string): Promise<never> {
  notSupported("Table extraction");
}

export async function extractMetadata(_file: File | Blob, _filename: string): Promise<never> {
  notSupported("Metadata extraction");
}

export async function extractStructure(_file: File | Blob, _filename: string): Promise<never> {
  notSupported("Structure extraction");
}

// ── Analysis ────────────────────────────────────────

export async function analyzeSummary(_file: File | Blob, _filename: string): Promise<never> {
  notSupported("Summary analysis");
}

export async function analyzeKeywords(_file: File | Blob, _filename: string): Promise<never> {
  notSupported("Keyword analysis");
}

export async function analyzeEntities(_file: File | Blob, _filename: string): Promise<never> {
  notSupported("Entity extraction");
}

// ── OCR ─────────────────────────────────────────────

export async function ocrExtract(_file: File | Blob, _filename: string): Promise<never> {
  notSupported("Standalone OCR");
}

// ── Documents (history) ─────────────────────────────
// docling-serve is a stateless conversion service — it keeps no document history.

export async function listDocuments(_page: number = 1, _limit: number = 20): Promise<never> {
  notSupported("Document history");
}

export async function getDocument(_docId: string): Promise<never> {
  notSupported("Document history");
}

export async function downloadDocument(_docId: string): Promise<never> {
  notSupported("Document history");
}

export async function reprocessDocument(_docId: string): Promise<never> {
  notSupported("Document history");
}

// ── Health ──────────────────────────────────────────

export async function checkHealth() {
  if (!DOCLING_API_URL) throw new Error("DOCLING_API_URL not configured");
  const res = await fetch(`${DOCLING_API_URL}/health`, { headers: authHeaders() });
  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Docling API ${res.status}`);
  }
  if (!res.ok) throw new Error(data?.detail || `Docling API ${res.status}`);
  return data;
}
