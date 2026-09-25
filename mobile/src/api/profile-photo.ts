import { apiFetch, apiUpload } from "@/api/client";

/**
 * A foto de perfil.
 *
 * Vai por `FormData` como o envio de documentos, e pelo mesmo motivo: no React
 * Native o arquivo é `{ uri, name, type }`, não um `Blob` — o `fetch` do
 * aparelho lê o arquivo do disco a partir da uri.
 *
 * Passa pelo `apiUpload`, não por um `fetch` solto: o access token dura 15
 * minutos e sem a renovação no 401 o paciente que ficasse dezesseis minutos no
 * app só via "não foi possível salvar".
 */

export async function uploadProfilePhoto(uri: string, mimeType: string): Promise<string | null> {
  const form = new FormData();
  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  form.append("file", { uri, name: `profile.${ext}`, type: mimeType } as any);
  const body = await apiUpload<{ profileImageUrl?: string | null }>(
    "/api/patient/profile/photo",
    form
  );
  return body?.profileImageUrl ?? null;
}

export async function removeProfilePhoto(): Promise<void> {
  await apiFetch("/api/patient/profile/photo", { method: "DELETE" });
}
