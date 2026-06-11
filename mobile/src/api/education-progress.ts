import { apiFetch } from "./client";

export interface EducationProgress {
  contentId: string;
  status: string;
  completedAt?: string;
  rating?: number;
  feedback?: string;
}

export async function updateEducationProgress(data: {
  contentId: string;
  status: string;
  rating?: number;
  feedback?: string;
}): Promise<EducationProgress> {
  const res = await apiFetch<{ progress: EducationProgress }>("/api/education/progress", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.progress;
}
