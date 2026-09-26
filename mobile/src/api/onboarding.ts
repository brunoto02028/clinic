import { apiFetch } from "./client";

/**
 * O que a pessoa veio fazer (083).
 *
 * `clinic` a torna paciente da clínica na hora — é ela dizendo "quero ser
 * atendido". `lab` não escreve nada: quem quer só um exame já é o que é.
 */
export async function setIntent(intent: "lab" | "clinic"): Promise<{ intent: string }> {
  return apiFetch<{ intent: string }>("/api/patient/intent", {
    method: "POST",
    body: JSON.stringify({ intent }),
  });
}
