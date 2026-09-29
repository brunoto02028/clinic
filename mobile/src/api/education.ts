import { apiFetch } from "./client";

/**
 * Um pedaco do artigo, ja traduzido de HTML pelo servidor (28/09/2026).
 *
 * O corpo do material vem em HTML — e o `<Text>` desenha o que recebe, entao
 * o paciente lia `<h2><span style=...` e dezenas de `&nbsp;`. A traducao mora
 * em `lib/rich-text-blocks.ts`, num lugar so, e aqui chega pronto.
 */
export type BlocoDoArtigo =
  | { tipo: "titulo"; nivel: 1 | 2 | 3; texto: string }
  | { tipo: "paragrafo"; texto: string }
  | { tipo: "lista"; itens: string[]; ordenada: boolean }
  | { tipo: "citacao"; texto: string }
  | { tipo: "imagem"; url: string; legenda?: string }
  /** Uma tabela que veio achatada num parágrafo — ver `lib/rich-text-blocks.ts`. */
  | { tipo: "tabela"; cabecalho: string[]; linhas: string[][] }
  | { tipo: "separador" };

export interface EduContent {
  id: string;
  title: string;
  description: string | null;
  contentType: string;
  category?: { id: string; name: string; color: string | null } | null;
  /** A imagem de capa do artigo, quando ele tem uma. */
  thumbnailUrl?: string | null;
  blocks?: BlocoDoArtigo[];
  [key: string]: any;
}

export interface EduProgress {
  contentId: string;
  completedAt?: string | null;
  progressPercent?: number | null;
  [key: string]: any;
}

/**
 * O que o terapeuta mandou para esta pessoa (096 T-5).
 *
 * A rota sempre devolveu `note`, `dueDate`, `isRequired` e `isCompleted` — e o
 * app declarava só `id` e `content`, então quatro coisas que mudam o que a
 * pessoa faz primeiro nunca chegaram à tela.
 */
export interface EduAssignment {
  id: string;
  content: EduContent;
  /** O que o terapeuta escreveu **sobre este material, para esta pessoa**. */
  note?: string | null;
  dueDate?: string | null;
  isRequired?: boolean;
  isCompleted?: boolean;
  assignedBy?: { firstName: string; lastName: string } | null;
}

export interface EducationData {
  assignments: EduAssignment[];
  published: EduContent[];
  /** Keyed by contentId. The endpoint has always returned this; the client
   *  dropped it, so the "completed" badge could never appear and finishing a
   *  piece changed nothing on screen. */
  progress: Record<string, EduProgress>;
}

export async function fetchEducation(): Promise<EducationData> {
  const res = await apiFetch<EducationData>("/api/education");
  return {
    assignments: res.assignments ?? [],
    published: res.published ?? [],
    progress: res.progress ?? {},
  };
}

/** Flattened, de-duplicated list: assigned content first, then published. */
export function educationList(data: EducationData): EduContent[] {
  const assigned = data.assignments.map((a) => a.content).filter(Boolean);
  const seen = new Set(assigned.map((c) => c.id));
  return [...assigned, ...data.published.filter((c) => !seen.has(c.id))];
}
