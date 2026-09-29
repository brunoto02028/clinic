import { apiFetch } from "./client";

/**
 * O que os profissionais devolveram a este paciente (102 T-8).
 *
 * Receita, laudo, orientacao, pedido de exame — texto que alguem **escreveu e
 * assinou**, diferente do documento que alguem envia como arquivo.
 *
 * O encerrado continua na lista, com o motivo: e justamente quando uma receita
 * e suspensa que a pessoa precisa saber.
 */
export interface DocumentoDoProfissional {
  id: string;
  kind: "PRESCRIPTION" | "REPORT" | "GUIDANCE" | "EXAM_REQUEST";
  kindLabel: string;
  kindLabelPt: string;
  title: string;
  body: string;
  /** "Ana Medica · CRM 123456" — montada no servidor. */
  signature: string;
  from: string | null;
  sentAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
}

export async function fetchProfessionalDocuments(): Promise<DocumentoDoProfissional[]> {
  const r = await apiFetch<{ documents: DocumentoDoProfissional[] }>(
    "/api/patient/professional-documents"
  );
  return r.documents ?? [];
}
