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
    // The route has returned these all along; the client simply never declared
    // them, so every patient read English whatever their record said.
    namePt: string | null;
    descriptionPt: string | null;
    instructionsPt: string | null;
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

export async function completeExercise(prescriptionId: string): Promise<PrescribedExercise> {
  const res = await apiFetch<{ prescription: PrescribedExercise }>("/api/exercises", {
    method: "PATCH",
    body: JSON.stringify({ prescriptionId }),
  });
  return res.prescription;
}

/**
 * Whether today's session opens (activity 074, T-11).
 *
 * Its own call, not a field on the prescription list: the answer changes with
 * a new blood-pressure reading, not with the prescriptions, and both this app
 * and the web ask the same endpoint so they cannot disagree about it.
 */
export interface ExerciseClearance {
  state: "CLEAR" | "BLOCKED" | "NO_RECENT_READING" | "OVERRIDDEN";
  blocked: boolean;
  limits: { blockSystolic: number; blockDiastolic: number; stopSystolic: number; stopDiastolic: number };
  reading: { systolic: number; diastolic: number; measuredAt: string } | null;
  validForMinutes: number | null;
}

export async function fetchExerciseClearance(): Promise<ExerciseClearance> {
  return apiFetch<ExerciseClearance>("/api/patient/exercise-clearance");
}
