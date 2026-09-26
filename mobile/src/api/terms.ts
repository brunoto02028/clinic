import { apiFetch } from "./client";

/**
 * Os termos da clínica, da mesma fonte que a página publicada.
 *
 * O app tinha a **própria cópia** do texto: nove itens, contra os vinte e seis
 * publicados, e sem a seção do laboratório inteira. O Bruno abriu para reler e
 * achou curto — estava, e estava desatualizado desde que os termos cresceram.
 *
 * Buscar em vez de embutir significa que mudar os termos no servidor muda o
 * que o paciente lê, sem build e sem update.
 */
export interface SecaoDosTermos {
  chave: string;
  titulo: string;
  itens: Array<{ n: number; titulo: string; corpo: string }>;
}

export interface TermosResposta {
  version: string;
  locale: string;
  total: number;
  secoes: SecaoDosTermos[];
}

export async function fetchTermos(locale: "en-GB" | "pt-BR"): Promise<TermosResposta> {
  return apiFetch<TermosResposta>(`/api/terms?locale=${locale}`);
}
