import { apiFetch } from "./client";

/**
 * O que foi partilhado sobre mim, entre quem cuida de mim (102 T-9).
 *
 * O paciente nao autoriza cada partilha — quem detem o paciente decide, item a
 * item e colega a colega —, mas **nada disso e invisivel para ele**: quem
 * passou, o que, para quem, e quando. E ele pode cortar.
 *
 * O revogado vem junto, com a data: saber que algo foi partilhado e depois
 * cortado faz parte do que ele tem direito de ver.
 */
export interface PartilhaDeCuidado {
  id: string;
  item: string;
  itemLabel: string;
  itemLabelPt: string;
  note: string | null;
  from: string | null;
  fromClinic: string | null;
  to: string | null;
  sharedAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
}

export async function fetchCareShares(): Promise<PartilhaDeCuidado[]> {
  const r = await apiFetch<{ shares: PartilhaDeCuidado[] }>("/api/patient/care-shares");
  return r.shares ?? [];
}

/** Corta o acesso a este item. Dali para frente; o que foi lido fica. */
export async function revokeCareShare(id: string): Promise<void> {
  await apiFetch(`/api/patient/care-shares/${id}`, { method: "DELETE" });
}
