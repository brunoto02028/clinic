// Pure range validation for the workout product (T-20): RPE 1–10, RIR 0–5,
// reps/load ≥ 0. No imports, so it is usable from server routes and unit tests
// alike without pulling in Prisma.

function intInRange(v: unknown, min: number, max: number): boolean {
  return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
}
// Whole number ≥ min (for Int columns — rejects decimals, NaN and Infinity).
function intAtLeast(v: unknown, min: number): boolean {
  return typeof v === "number" && Number.isInteger(v) && v >= min;
}
// Finite number ≥ min (for Float columns — rejects NaN and Infinity).
function numAtLeast(v: unknown, min: number): boolean {
  return typeof v === "number" && Number.isFinite(v) && v >= min;
}

export interface WorkoutExerciseInput {
  exerciseId: string;
  order?: number;
  supersetGroup?: string | null;
  sets?: number | null;
  repsMin?: number | null;
  repsMax?: number | null;
  loadKg?: number | null;
  rpe?: number | null;
  rir?: number | null;
  cadence?: string | null;
  restSeconds?: number | null;
  notes?: string | null;
}

/** Returns an error message, or null when the exercise input is valid. */
export function validateExerciseInput(e: WorkoutExerciseInput): string | null {
  if (!e || typeof e.exerciseId !== "string" || !e.exerciseId) return "exerciseId is required";
  if (e.sets != null && !intAtLeast(e.sets, 0)) return "sets must be a whole number ≥ 0";
  if (e.repsMin != null && !intAtLeast(e.repsMin, 0)) return "repsMin must be a whole number ≥ 0";
  if (e.repsMax != null && !intAtLeast(e.repsMax, 0)) return "repsMax must be a whole number ≥ 0";
  if (e.repsMin != null && e.repsMax != null && e.repsMax < e.repsMin) return "repsMax must be ≥ repsMin";
  if (e.loadKg != null && !numAtLeast(e.loadKg, 0)) return "loadKg must be ≥ 0";
  if (e.rpe != null && !intInRange(e.rpe, 1, 10)) return "rpe must be 1–10";
  if (e.rir != null && !intInRange(e.rir, 0, 5)) return "rir must be 0–5";
  if (e.restSeconds != null && !intAtLeast(e.restSeconds, 0)) return "restSeconds must be a whole number ≥ 0";
  return null;
}

/** Validates a list of exercises; returns the first error or null. */
export function validateExercises(exercises: unknown): string | null {
  if (exercises == null) return null;
  if (!Array.isArray(exercises)) return "exercises must be an array";
  for (const e of exercises) {
    const err = validateExerciseInput(e as WorkoutExerciseInput);
    if (err) return err;
  }
  return null;
}

// ── Session logging (the student records what they did) ──

export interface SetLogInput {
  workoutExerciseId: string;
  setNumber: number;
  reps?: number | null;
  loadKg?: number | null;
  rpe?: number | null;
  completed?: boolean;
}

export interface SessionLogInput {
  durationMin?: number | null;
  sessionRpe?: number | null;
  notes?: string | null;
  sets?: SetLogInput[];
}

/** Returns an error message, or null when the logged set is valid. */
export function validateSetLog(s: SetLogInput): string | null {
  if (!s || typeof s.workoutExerciseId !== "string" || !s.workoutExerciseId) return "workoutExerciseId is required";
  if (!intAtLeast(s.setNumber, 1)) return "setNumber must be a whole number ≥ 1";
  if (s.reps != null && !intAtLeast(s.reps, 0)) return "reps must be a whole number ≥ 0";
  if (s.loadKg != null && !numAtLeast(s.loadKg, 0)) return "loadKg must be ≥ 0";
  if (s.rpe != null && !intInRange(s.rpe, 1, 10)) return "rpe must be 1–10";
  return null;
}

/** Validates a whole session log (session RPE + its sets). First error or null. */
export function validateSessionLog(input: SessionLogInput): string | null {
  if (input.sessionRpe != null && !intInRange(input.sessionRpe, 1, 10)) return "sessionRpe must be 1–10";
  if (input.durationMin != null && !intAtLeast(input.durationMin, 0)) return "durationMin must be a whole number ≥ 0";
  if (input.notes != null && typeof input.notes !== "string") return "notes must be a string";
  const sets = input.sets;
  if (sets != null) {
    if (!Array.isArray(sets)) return "sets must be an array";
    for (const s of sets) {
      const err = validateSetLog(s);
      if (err) return err;
    }
  }
  return null;
}
