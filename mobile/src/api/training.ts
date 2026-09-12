import { apiFetch } from "./client";

export interface WorkoutExercise {
  id: string;
  supersetGroup: string | null;
  sets: number | null;
  repsMin: number | null;
  repsMax: number | null;
  loadKg: number | null;
  rpe: number | null;
  rir: number | null;
  cadence: string | null;
  restSeconds: number | null;
  exercise: {
    id: string;
    name: string;
    namePt: string | null;
    videoUrl: string | null;
    thumbnailUrl: string | null;
  } | null;
}

export interface Workout {
  id: string;
  name: string;
  phase: string | null;
  daysOfWeek: number[];
  // Set only for a workout generated from a Program Template assignment
  // (activity 33) — recurring, manually-created workouts leave both null.
  scheduledDate: string | null;
  templateDayId: string | null;
  exercises: WorkoutExercise[];
}

export interface SetLog {
  id: string;
  workoutExerciseId: string;
  setNumber: number;
  reps: number | null;
  loadKg: number | null;
  rpe: number | null;
  completed: boolean;
}

export interface SessionLog {
  id: string;
  performedAt: string;
  durationMin: number | null;
  sessionRpe: number | null;
  setLogs: SetLog[];
}

export interface SetLogInput {
  workoutExerciseId: string;
  setNumber: number;
  reps?: number | null;
  loadKg?: number | null;
  rpe?: number | null;
  completed?: boolean;
}

export function fetchWorkouts(): Promise<Workout[]> {
  return apiFetch<Workout[]>("/api/mobile/workouts");
}

export function fetchWorkoutHistory(workoutId: string): Promise<SessionLog[]> {
  return apiFetch<SessionLog[]>(`/api/mobile/workouts/${workoutId}/logs`);
}

export function logSession(
  workoutId: string,
  body: { sessionRpe?: number | null; durationMin?: number | null; notes?: string | null; sets: SetLogInput[] }
): Promise<SessionLog> {
  return apiFetch<SessionLog>(`/api/mobile/workouts/${workoutId}/logs`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
