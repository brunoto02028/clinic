import { apiFetch } from "./client";
import { API_URL } from "./config";
import { tokenStorage } from "@/lib/secure-storage";

export interface CreatedScan {
  id: string;
  scanNumber: string;
  status: string;
}

/** Creates a new foot scan (PENDING_UPLOAD) for the authenticated patient. */
export function createFootScan(): Promise<CreatedScan> {
  return apiFetch<CreatedScan>("/api/foot-scans", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/**
 * Uploads one captured photo (multipart). Uses fetch directly (not apiFetch)
 * because FormData must set its own Content-Type/boundary — we only inject the
 * bearer token.
 */
export async function uploadFootPhoto(
  scanId: string,
  foot: "left" | "right",
  angle: string,
  photoUri: string
): Promise<void> {
  const access = await tokenStorage.getAccess();
  const form = new FormData();
  form.append("file", { uri: photoUri, name: `${foot}-${angle}.jpg`, type: "image/jpeg" } as any);
  form.append("foot", foot);
  form.append("angle", angle);

  const res = await fetch(`${API_URL}/api/foot-scans/${scanId}/upload-local`, {
    method: "POST",
    headers: access ? { Authorization: `Bearer ${access}` } : undefined,
    body: form,
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error((d as any)?.error || `Falha no upload (${res.status})`);
  }
}

/** Triggers the AI (Gemini) analysis for the scan. */
export function analyzeFootScan(scanId: string): Promise<any> {
  return apiFetch(`/api/foot-scans/${scanId}/analyze`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}
