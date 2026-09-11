// AI Workout Builder (activity 32). Generates a workout DRAFT from the tenant's
// own exercise catalog — never persists anything (the caller's normal
// POST /api/admin/workouts save flow does that, unchanged). The catalog sent to
// the model is a closed set; any exerciseId the model returns that isn't in that
// set is discarded (never trusted, never falls back to the whole tenant catalog).
import { parseAIJson } from "@/lib/ai-provider";

export interface CatalogExercise {
  id: string;
  name: string;
  namePt?: string | null;
  bodyRegion: string;
  difficulty: string;
  tags: string[];
  videoUrl: string | null;
  defaultSets: number | null;
  defaultReps: number | null;
  defaultRestSec: number | null;
}

export interface GeneratedExercise {
  exerciseId: string;
  name: string;
  videoUrl: string | null;
  supersetGroup: null;
  sets: number | null;
  repsMin: number | null;
  repsMax: number | null;
  loadKg: null; // the AI never guesses load — that's the trainer's call
  rpe: number | null;
  rir: number | null;
  cadence: string | null;
  restSeconds: number | null;
}

export interface GeneratedWorkout {
  name: string;
  phase: string | null;
  exercises: GeneratedExercise[];
}

const CATALOG_CAP = 60;

/**
 * Narrows the catalog to what's sent to the model: prioritised by `focus`
 * (matched against bodyRegion/tags/name), capped for token cost. If a focus was
 * given but matches nothing, falls back to the full catalog and flags it — the
 * caller surfaces that to the trainer rather than silently generating an
 * off-topic workout.
 */
export function buildCatalogForPrompt(
  exercises: CatalogExercise[],
  focus: string | undefined,
  cap: number = CATALOG_CAP
): { catalogText: string; usedExercises: CatalogExercise[]; usedFallback: boolean } {
  let pool = exercises;
  let usedFallback = false;

  const focusTrim = focus?.trim().toLowerCase();
  if (focusTrim) {
    const words = focusTrim.split(/\s+/).filter((w) => w.length > 2);
    const matched = exercises.filter((e) => {
      const hay = `${e.bodyRegion} ${e.tags.join(" ")} ${e.name}`.toLowerCase();
      return hay.includes(focusTrim) || words.some((w) => hay.includes(w));
    });
    if (matched.length > 0) pool = matched;
    else usedFallback = true; // focus given, nothing matched → use everything, flag it
  }

  const used = pool.slice(0, cap);
  const catalogText = used
    .map((e) => `${e.id}|${e.name}|${e.bodyRegion}|${e.tags.join(",")}|${e.difficulty}|sets:${e.defaultSets ?? "-"} reps:${e.defaultReps ?? "-"} rest:${e.defaultRestSec ?? "-"}`)
    .join("\n");

  return { catalogText, usedExercises: used, usedFallback };
}

export interface WorkoutGenInput {
  goal?: string;
  level?: string;
  daysPerWeek?: number;
  focus?: string;
  notes?: string;
}

export function buildWorkoutPrompt(input: WorkoutGenInput, catalogText: string): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are an assistant that builds ONE strength-training workout for a personal trainer's client, choosing ONLY from the exercise catalog below.

Client context:
- Goal: ${input.goal?.trim() || "general fitness"}
- Level: ${input.level?.trim() || "intermediate"}
- Training frequency: ${input.daysPerWeek ? `${input.daysPerWeek} days/week` : "not specified"}
- Focus: ${input.focus?.trim() || "full body"}
${input.notes?.trim() ? `- Trainer notes: ${input.notes.trim()}` : ""}

Exercise catalog (id|name|bodyRegion|tags|difficulty|defaults):
${catalogText}

Rules:
- Choose 5-10 exercises appropriate for the goal/level/focus, ordered sensibly (compound movements first, isolation/accessory last).
- ONLY use "exerciseId" values that appear in the catalog above. NEVER invent an id or an exercise not in the list — this is a hard requirement, not a suggestion.
- Do NOT suggest a specific load/weight in kg — that is set by the trainer individually per client. Never include a load value.
- If a value isn't clearly appropriate, leave it null rather than guessing.
- "rpe" is 1-10, "rir" is 0-5 — use at most one of them per exercise, or neither.
- Do not invent data outside this schema.

Return ONLY a JSON object with this exact shape — no prose, no markdown fences, no commentary:
{
  "name": "short descriptive workout name",
  "phase": "optional training phase label, or null",
  "exercises": [
    { "exerciseId": "id from the catalog", "sets": number|null, "repsMin": number|null, "repsMax": number|null, "rpe": number|null, "rir": number|null, "cadence": "e.g. 3-1-1"|null, "restSeconds": number|null }
  ]
}`;

  return { systemPrompt, userPrompt: "Generate the workout now, based on the context above." };
}

/**
 * Parses + validates the model's raw output. Any exerciseId not in `exerciseById`
 * (the exact subset sent in the prompt, not the whole tenant catalog) is
 * discarded. Missing numeric fields fall back to the exercise's own defaults.
 * Throws on unparseable/empty-after-filtering output — the caller turns that
 * into a 502 "try again", never a crash.
 */
export function validateGeneratedWorkout(raw: string, exerciseById: Map<string, CatalogExercise>): GeneratedWorkout {
  const parsed = parseAIJson<any>(raw); // throws on unparseable/truncated JSON
  if (!parsed || typeof parsed !== "object") throw new Error("Invalid AI response shape");

  const name = typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim() : "AI Workout";
  const phase = typeof parsed.phase === "string" && parsed.phase.trim() ? parsed.phase.trim() : null;
  const rawExercises = Array.isArray(parsed.exercises) ? parsed.exercises : [];

  const numOrNull = (v: unknown, fallback: number | null): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : fallback;

  const exercises: GeneratedExercise[] = [];
  for (const item of rawExercises) {
    if (!item || typeof item.exerciseId !== "string") continue;
    const ex = exerciseById.get(item.exerciseId);
    if (!ex) continue; // not in the sent catalog → hallucinated or stale id, discard silently

    exercises.push({
      exerciseId: ex.id,
      name: ex.name,
      videoUrl: ex.videoUrl,
      supersetGroup: null,
      sets: numOrNull(item.sets, ex.defaultSets ?? null),
      repsMin: numOrNull(item.repsMin, null),
      repsMax: numOrNull(item.repsMax, ex.defaultReps ?? null),
      loadKg: null,
      rpe: numOrNull(item.rpe, null),
      rir: numOrNull(item.rir, null),
      cadence: typeof item.cadence === "string" && item.cadence.trim() ? item.cadence.trim() : null,
      restSeconds: numOrNull(item.restSeconds, ex.defaultRestSec ?? null),
    });
  }

  if (exercises.length === 0) throw new Error("No valid exercises in AI response");
  return { name, phase, exercises };
}

export class AITimeoutError extends Error {
  constructor(message = "AI request timed out") {
    super(message);
    this.name = "AITimeoutError";
  }
}

/**
 * Races a promise against a timeout. lib/ai-provider's callAI has no
 * AbortSignal, so this can't cancel the underlying fetch — but it guarantees
 * the ROUTE (and therefore the UI) never hangs indefinitely (G-6): past the
 * timeout we respond to the client even if the provider call resolves later
 * in the background.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new AITimeoutError()), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}
