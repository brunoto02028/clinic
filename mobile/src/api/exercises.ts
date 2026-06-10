import { apiFetch } from "./client";

export interface PrescribedExercise {
  id: string;
  sets: number | null;
  reps: number | null;
  holdSeconds: number | null;
  frequency: string | null;
  notes: string | null;
  exercise: {
    id: string;
    name: string;
    description: string | null;
    instructions: string | null;
    bodyRegion: string;
    difficulty: string;
    videoUrl: string | null;
    thumbnailUrl: string | null;
  };
  therapist: { firstName: string; lastName: string } | null;
}

export async function fetchPrescriptions(): Promise<PrescribedExercise[]> {
  const res = await apiFetch<{ prescriptions: PrescribedExercise[] }>("/api/exercises");
  return res.prescriptions ?? [];
}
