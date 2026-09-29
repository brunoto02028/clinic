import { apiFetch } from "./client";

/**
 * Quem tem acesso aos dados deste paciente (102 T-3).
 *
 * Ele nao autoriza cada partilha — quem decide o que o colega ve e a clinica
 * que cuida dele —, mas **nada disso e invisivel para ele**. Esta e a lista, e
 * o botao que encerra.
 */
export interface VinculoDeCuidado {
  id: string;
  acceptedAt: string;
  endedAt: string | null;
  active: boolean;
  professional: {
    name: string;
    kind: string;
    kindPt: string;
    registry: string | null;
    registryKind: string | null;
  };
}

export async function fetchCareLinks(): Promise<VinculoDeCuidado[]> {
  const r = await apiFetch<{ careLinks: VinculoDeCuidado[] }>("/api/patient/care-links");
  return r.careLinks ?? [];
}

/** Encerra o acesso. Corta dali para frente; o que ja houve fica. */
export async function endCareLink(id: string): Promise<void> {
  await apiFetch(`/api/patient/care-links/${id}`, { method: "DELETE" });
}
