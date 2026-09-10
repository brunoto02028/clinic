export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";
import { getMobileActor } from "@/lib/mobile-actor";
import {
  assertStudentTrainingAccess,
  assertWorkoutForStudent,
  assertSetExercisesInWorkout,
} from "@/lib/workout-access";
import { validateSessionLog, type SetLogInput } from "@/lib/workout-validation";
import { AccessError } from "@/lib/tenant-access";

export function OPTIONS() {
  return corsPreflight();
}

// POST — the student logs a performed session (mobile Bearer).
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await getMobileActor(request);
    if (!actor) return corsJson({ error: "Unauthorized" }, { status: 401 });
    await assertStudentTrainingAccess(actor);
    const workout = await assertWorkoutForStudent(actor, params.id);
    if (!workout.isActive) throw new AccessError(404, "Not found");

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return corsJson({ error: "Invalid request body" }, { status: 400 });
    }
    const vErr = validateSessionLog(body);
    if (vErr) return corsJson({ error: vErr }, { status: 400 });

    const sets: SetLogInput[] = Array.isArray(body.sets) ? body.sets : [];
    if (sets.length === 0) return corsJson({ error: "Log at least one set" }, { status: 400 });
    const ownErr = await assertSetExercisesInWorkout(workout.id, sets.map((s) => s.workoutExerciseId));
    if (ownErr) return corsJson({ error: ownErr }, { status: 400 });

    const log = await prisma.workoutLog.create({
      data: {
        clinicId: workout.clinicId,
        workoutId: workout.id,
        studentId: actor.userId,
        durationMin: body.durationMin ?? null,
        sessionRpe: body.sessionRpe ?? null,
        notes: body.notes ?? null,
        setLogs: {
          create: sets.map((s) => ({
            workoutExerciseId: s.workoutExerciseId,
            setNumber: s.setNumber,
            reps: s.reps ?? null,
            loadKg: s.loadKg ?? null,
            rpe: s.rpe ?? null,
            completed: s.completed === true,
          })),
        },
      },
      include: { setLogs: true },
    });
    return corsJson(log, { status: 201 });
  } catch (err) {
    if (err instanceof AccessError) return corsJson({ error: err.message }, { status: err.status });
    console.error("[mobile/workouts/[id]/logs] POST error:", (err as any)?.message);
    return corsJson({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}

// GET — the student's session history for this workout. Deliberately does NOT
// require isActive: a deactivated workout can't be logged to (POST → 404) but
// its already-recorded history stays readable to the student who owns it.
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await getMobileActor(request);
    if (!actor) return corsJson({ error: "Unauthorized" }, { status: 401 });
    await assertStudentTrainingAccess(actor);
    await assertWorkoutForStudent(actor, params.id);

    const logs = await prisma.workoutLog.findMany({
      where: { workoutId: params.id, studentId: actor.userId },
      include: { setLogs: true },
      orderBy: { performedAt: "desc" },
      take: 50,
    });
    return corsJson(logs);
  } catch (err) {
    if (err instanceof AccessError) return corsJson({ error: err.message }, { status: err.status });
    console.error("[mobile/workouts/[id]/logs] GET error:", (err as any)?.message);
    return corsJson({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
