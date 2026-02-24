const DOCLING_API_URL = process.env.DOCLING_API_URL || "http://5.182.18.148:8000";
const DOCLING_API_TOKEN = process.env.DOCLING_API_TOKEN || "";

function headers(extra?: Record<string, string>) {
  return {
    Authorization: `Bearer ${DOCLING_API_TOKEN}`,
    ...extra,
  };
}

async function doclingFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${DOCLING_API_URL}${path}`, {
    ...init,
    headers: { ...headers(), ...init?.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || data?.message || `Docling API ${res.status}`);
  return data;
}

// ── Conversion ──────────────────────────────────────

export async function convertDocument(file: File | Blob, filename: string, format: string = "markdown") {
  const formData = new FormData();
  formData.append("file", file, filename);

  const endpoint =
    format === "json" ? "/api/v1/docling/convert/pdf-to-json" :
    format === "html" ? "/api/v1/docling/convert/pdf-to-html" :
    format === "text" ? "/api/v1/docling/convert/pdf-to-text" :
    "/api/v1/docling/convert/pdf-to-markdown";

  const res = await fetch(`${DOCLING_API_URL}${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${DOCLING_API_TOKEN}` },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || `Conversion failed: ${res.status}`);
  return data;
}

export async function convertGeneral(file: File | Blob, filename: string) {
  const formData = new FormData();
  formData.append("file", file, filename);

  const res = await fetch(`${DOCLING_API_URL}/api/v1/docling/convert`, {
    method: "POST",
    headers: { Authorization: `Bearer ${DOCLING_API_TOKEN}` },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || `Conversion failed: ${res.status}`);
  return data;
}

// ── Extraction ──────────────────────────────────────

export async function extractText(file: File | Blob, filename: string) {
  const formData = new FormData();
  formData.append("file", file, filename);
  const res = await fetch(`${DOCLING_API_URL}/api/v1/docling/extract/text`, {
    method: "POST",
    headers: { Authorization: `Bearer ${DOCLING_API_TOKEN}` },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || `Extraction failed: ${res.status}`);
  return data;
}

export async function extractTables(file: File | Blob, filename: string) {
  const formData = new FormData();
  formData.append("file", file, filename);
  const res = await fetch(`${DOCLING_API_URL}/api/v1/docling/extract/tables`, {
    method: "POST",
    headers: { Authorization: `Bearer ${DOCLING_API_TOKEN}` },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || `Table extraction failed: ${res.status}`);
  return data;
}

export async function extractMetadata(file: File | Blob, filename: string) {
  const formData = new FormData();
  formData.append("file", file, filename);
  const res = await fetch(`${DOCLING_API_URL}/api/v1/docling/extract/metadata`, {
    method: "POST",
    headers: { Authorization: `Bearer ${DOCLING_API_TOKEN}` },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || `Metadata extraction failed: ${res.status}`);
  return data;
}

export async function extractStructure(file: File | Blob, filename: string) {
  const formData = new FormData();
  formData.append("file", file, filename);
  const res = await fetch(`${DOCLING_API_URL}/api/v1/docling/extract/structure`, {
    method: "POST",
    headers: { Authorization: `Bearer ${DOCLING_API_TOKEN}` },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || `Structure extraction failed: ${res.status}`);
  return data;
}

// ── Analysis ────────────────────────────────────────

export async function analyzeSummary(file: File | Blob, filename: string) {
  const formData = new FormData();
  formData.append("file", file, filename);
  const res = await fetch(`${DOCLING_API_URL}/api/v1/docling/analyze/summary`, {
    method: "POST",
    headers: { Authorization: `Bearer ${DOCLING_API_TOKEN}` },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || `Summary failed: ${res.status}`);
  return data;
}

export async function analyzeKeywords(file: File | Blob, filename: string) {
  const formData = new FormData();
  formData.append("file", file, filename);
  const res = await fetch(`${DOCLING_API_URL}/api/v1/docling/analyze/keywords`, {
    method: "POST",
    headers: { Authorization: `Bearer ${DOCLING_API_TOKEN}` },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || `Keywords failed: ${res.status}`);
  return data;
}

export async function analyzeEntities(file: File | Blob, filename: string) {
  const formData = new FormData();
  formData.append("file", file, filename);
  const res = await fetch(`${DOCLING_API_URL}/api/v1/docling/analyze/entities`, {
    method: "POST",
    headers: { Authorization: `Bearer ${DOCLING_API_TOKEN}` },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || `Entity extraction failed: ${res.status}`);
  return data;
}

// ── OCR ─────────────────────────────────────────────

export async function ocrExtract(file: File | Blob, filename: string) {
  const formData = new FormData();
  formData.append("file", file, filename);
  const res = await fetch(`${DOCLING_API_URL}/api/v1/docling/ocr/extract`, {
    method: "POST",
    headers: { Authorization: `Bearer ${DOCLING_API_TOKEN}` },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || `OCR failed: ${res.status}`);
  return data;
}

// ── Documents (history) ─────────────────────────────

export async function listDocuments(page: number = 1, limit: number = 20) {
  return doclingFetch(`/api/v1/documents?page=${page}&limit=${limit}`);
}

export async function getDocument(docId: string) {
  return doclingFetch(`/api/v1/documents/${docId}`);
}

export async function downloadDocument(docId: string) {
  return doclingFetch(`/api/v1/documents/${docId}/download`);
}

export async function reprocessDocument(docId: string) {
  return doclingFetch(`/api/v1/documents/${docId}/reprocess`, { method: "POST" });
}

// ── Health ──────────────────────────────────────────

export async function checkHealth() {
  return doclingFetch("/api/v1/health");
}
