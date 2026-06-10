import { apiFetch } from "./client";

export interface EduContent {
  id: string;
  title: string;
  description: string | null;
  contentType: string;
  category?: { id: string; name: string; color: string | null } | null;
  [key: string]: any;
}

export interface EducationData {
  assignments: { id: string; content: EduContent }[];
  published: EduContent[];
}

export async function fetchEducation(): Promise<EducationData> {
  const res = await apiFetch<EducationData>("/api/education");
  return { assignments: res.assignments ?? [], published: res.published ?? [] };
}

/** Flattened, de-duplicated list: assigned content first, then published. */
export function educationList(data: EducationData): EduContent[] {
  const assigned = data.assignments.map((a) => a.content).filter(Boolean);
  const seen = new Set(assigned.map((c) => c.id));
  return [...assigned, ...data.published.filter((c) => !seen.has(c.id))];
}
