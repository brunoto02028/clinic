import { apiFetch } from "./client";

export interface PatientDocument {
  id: string;
  fileName: string;
  fileUrl: string;
  /**
   * Absolute, signed, short-lived link the phone's viewer can open on its own
   * (activity 074, auditoria de paridade). `fileUrl` is relative and behind a
   * cookie: handing it to `Linking.openURL` did nothing at all.
   */
  openUrl?: string | null;
  /** The MIME type ("application/pdf"). Not the category. */
  fileType: string;
  /** The clinic's category (REFERRAL, SCAN, REPORT...). The screen was
   *  labelling cards with `fileType`, so every PDF read "application/pdf"
   *  where the web shows what kind of document it is. */
  documentType: string | null;
  title: string | null;
  description: string | null;
  documentDate: string | null;
}

export async function fetchDocuments(): Promise<PatientDocument[]> {
  const res = await apiFetch<{ documents: PatientDocument[] }>("/api/patient/documents");
  return res.documents ?? [];
}
