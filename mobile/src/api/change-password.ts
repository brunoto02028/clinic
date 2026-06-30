import { apiFetch } from "./client";

export async function changePassword(data: {
  currentPassword?: string;
  newPassword: string;
}): Promise<void> {
  await apiFetch<{ success: boolean }>("/api/patient/change-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
