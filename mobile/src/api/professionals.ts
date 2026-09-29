import { apiFetch } from "./client";

/**
 * Com quem este paciente pode marcar (102 T-5).
 *
 * Quem entra no catalogo e decidido no servidor (`podeAparecerNoApp`): so
 * profissional intermediado pela BPR, **ligado por alguem**, e com registro do
 * conselho. A tela nao filtra nada disso — ela desenha o que veio.
 */
export interface Profissional {
  /** O inquilino da pratica. */
  id: string;
  /** Quem atende — e este id que a agenda e a marcacao usam. */
  professionalUserId: string;
  name: string;
  kind: string;
  kindPt: string;
  registry: string | null;
  registryKind: string | null;
  languages: string[];
  currency: string;
  timezone: string;
  logoUrl: string | null;
  price: number | null;
  /** Atende so por video — o tipo decide, e a tela nao oferece presencial. */
  videoOnly: boolean;
}

export async function fetchProfessionals(language?: string): Promise<Profissional[]> {
  const q = language ? `?language=${encodeURIComponent(language)}` : "";
  const r = await apiFetch<{ professionals: Profissional[] }>(`/api/patient/professionals${q}`);
  return r.professionals ?? [];
}
