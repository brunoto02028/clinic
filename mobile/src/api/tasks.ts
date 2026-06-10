import { apiFetch } from "./client";

export interface PatientTask {
  id: string;
  type: string;
  title: string;
  titlePt: string | null;
  description: string | null;
  descriptionPt: string | null;
  priority: string;
  status: string;
  dueDate: string | null;
}

export async function fetchTasks(): Promise<PatientTask[]> {
  const res = await apiFetch<{ tasks: PatientTask[] }>("/api/patient/tasks");
  return res.tasks ?? [];
}

export async function completeTask(taskId: string): Promise<void> {
  await apiFetch("/api/patient/tasks", {
    method: "PATCH",
    body: JSON.stringify({ taskId, status: "completed" }),
  });
}
