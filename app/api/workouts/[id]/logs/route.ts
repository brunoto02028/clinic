export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, accessErrorResponse, AccessError } from "@/lib/tenant-access";
import {
  assertStudentTrainingAccess,
  assertWorkoutForStudent,
  assertSetExercisesInWorkout,
} from "@/lib/workout-access";
import { validateSessionLog, type SetLogInput } from "@/lib/workout-validation";

// POST — the student logs a performed session for one of their workouts.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertStudentTrainingAccess(actor);
    const workout = await assertWorkoutForStudent(actor, params.id);
    // A deactivated workout is hidden from the student's list; don't accept logs
    // to it either (a stale client id or a replay).
    if (!workout.isActive) throw new AccessError(404, "Not found");

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const vErr = validateSessionLog(body);
    if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });

    const sets: SetLogInput[] = Array.isArray(body.sets) ? body.sets : [];
    if (sets.length === 0) {
      return NextResponse.json({ error: "Log at least one set" }, { status: 400 });
    }
    const ownErr = await assertSetExercisesInWorkout(workout.id, sets.map((s) => s.workoutExerciseId));
    if (ownErr) return NextResponse.json({ error: ownErr }, { status: 400 });

    const log = await prisma.workoutLog.create({
      data: {
        clinicId: workout.clinicId,
        workoutId: workout.id,
        studentId: actor.userId,
        durationMin: body?.durationMin ?? null,
        sessionRpe: body?.sessionRpe ?? null,
        notes: body?.notes ?? null,
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
    return NextResponse.json(log, { status: 201 });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[workouts/[id]/logs] POST error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}

// GET — the student's session history for this workout (most recent first).
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertStudentTrainingAccess(actor);
    await assertWorkoutForStudent(actor, params.id);

    const logs = await prisma.workoutLog.findMany({
      where: { workoutId: params.id, studentId: actor.userId },
      include: { setLogs: true },
      orderBy: { performedAt: "desc" },
      take: 50,
    });
    return NextResponse.json(logs);
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[workouts/[id]/logs] GET error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
