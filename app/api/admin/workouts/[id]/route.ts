export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getActor,
  assertRecordAccess,
  accessErrorResponse,
  AccessError,
} from "@/lib/tenant-access";
import {
  assertTrainingAccess,
  validateExercises,
  assertExercisesInTenant,
  type WorkoutExerciseInput,
} from "@/lib/workout-access";

function mapExercise(e: WorkoutExerciseInput, i: number) {
  return {
    exerciseId: e.exerciseId,
    order: typeof e.order === "number" ? e.order : i,
    supersetGroup: e.supersetGroup ?? null,
    sets: e.sets ?? null,
    repsMin: e.repsMin ?? null,
    repsMax: e.repsMax ?? null,
    loadKg: e.loadKg ?? null,
    rpe: e.rpe ?? null,
    rir: e.rir ?? null,
    cadence: e.cadence ?? null,
    restSeconds: e.restSeconds ?? null,
    notes: e.notes ?? null,
  };
}

/** Loads a workout and asserts it belongs to the actor's tenant (404 otherwise). */
async function loadOwned(actor: Awaited<ReturnType<typeof getActor>>, id: string) {
  const workout = await prisma.workout.findUnique({
    where: { id },
    select: { id: true, clinicId: true },
  });
  // assertRecordAccess answers 404 for a missing row or another tenant's row.
  assertRecordAccess(actor!, { clinicId: workout?.clinicId ?? null });
  return workout!;
}

// GET — one workout with its exercises.
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertTrainingAccess(actor);
    await loadOwned(actor, params.id);

    const workout = await prisma.workout.findUnique({
      where: { id: params.id },
      include: {
        exercises: {
          orderBy: { order: "asc" },
          include: { exercise: { select: { id: true, name: true, namePt: true, videoUrl: true, thumbnailUrl: true } } },
        },
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return NextResponse.json(workout);
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/workouts/[id]] GET error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}

// PATCH — update workout fields; if `exercises` is present, replace the set.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = await assertTrainingAccess(actor);
    await loadOwned(actor, params.id);

    const body = await request.json().catch(() => null);
    const data: Record<string, unknown> = {};
    if (typeof body?.name === "string" && body.name.trim()) data.name = body.name.trim();
    if (typeof body?.order === "number") data.order = body.order;
    if (Array.isArray(body?.daysOfWeek)) data.daysOfWeek = body.daysOfWeek.filter((d: unknown) => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6);
    if ("phase" in (body || {})) data.phase = body.phase ?? null;
    if ("notes" in (body || {})) data.notes = body.notes ?? null;
    if (typeof body?.isActive === "boolean") data.isActive = body.isActive;

    const hasExercises = Array.isArray(body?.exercises);
    if (hasExercises) {
      const exercises: WorkoutExerciseInput[] = body.exercises;
      const vErr = validateExercises(exercises);
      if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });
      const ownErr = await assertExercisesInTenant(clinicId, exercises);
      if (ownErr) return NextResponse.json({ error: ownErr }, { status: 400 });

      await prisma.$transaction([
        prisma.workoutExercise.deleteMany({ where: { workoutId: params.id } }),
        prisma.workout.update({
          where: { id: params.id },
          data: { ...data, exercises: { create: exercises.map(mapExercise) } },
        }),
      ]);
    } else {
      await prisma.workout.update({ where: { id: params.id }, data });
    }

    const updated = await prisma.workout.findUnique({
      where: { id: params.id },
      include: { exercises: { orderBy: { order: "asc" } } },
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/workouts/[id]] PATCH error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}

// DELETE — remove a workout (cascades to its exercises and logs).
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertTrainingAccess(actor);
    await loadOwned(actor, params.id);

    await prisma.workout.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/workouts/[id]] DELETE error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
