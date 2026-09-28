import { apiFetch } from "./client";

export interface EduContent {
  id: string;
  title: string;
  description: string | null;
  contentType: string;
  category?: { id: string; name: string; color: string | null } | null;
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
