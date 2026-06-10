import { apiFetch } from "./client";

export interface PatientDocument {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  title: string | null;
  description: string | null;
  documentDate: string | null;
}

export async function fetchDocuments(): Promise<PatientDocument[]> {
  const res = await apiFetch<{ documents: PatientDocument[] }>("/api/patient/documents");
  return res.documents ?? [];
}
