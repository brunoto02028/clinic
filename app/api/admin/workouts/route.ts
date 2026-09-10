export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getActor,
  tenantWhere,
  assertPatientAccess,
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

// GET — list the tenant's workouts (optional ?studentId=).
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertTrainingAccess(actor);

    const studentId = request.nextUrl.searchParams.get("studentId") || undefined;
    const workouts = await prisma.workout.findMany({
      where: { ...tenantWhere(actor), ...(studentId ? { studentId } : {}) },
      include: {
        exercises: {
          orderBy: { order: "asc" },
          include: { exercise: { select: { id: true, name: true, namePt: true, videoUrl: true, thumbnailUrl: true } } },
        },
        student: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(workouts);
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/workouts] GET error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}

// POST — create a workout for a student in the tenant, with its exercises.
export async function POST(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = await assertTrainingAccess(actor);

    const body = await request.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const studentId = body?.studentId;
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    if (!studentId) return NextResponse.json({ error: "studentId is required" }, { status: 400 });

    // Student must belong to this tenant (404 otherwise — no enumeration oracle).
    await assertPatientAccess(actor, studentId);

    const exercises: WorkoutExerciseInput[] = Array.isArray(body?.exercises) ? body.exercises : [];
    const vErr = validateExercises(exercises);
    if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });
    const ownErr = await assertExercisesInTenant(clinicId, exercises);
    if (ownErr) return NextResponse.json({ error: ownErr }, { status: 400 });

    const workout = await prisma.workout.create({
      data: {
        clinicId,
        trainerId: actor.userId,
        studentId,
        name,
        order: typeof body?.order === "number" ? body.order : 0,
        daysOfWeek: Array.isArray(body?.daysOfWeek)
          ? body.daysOfWeek.filter((d: unknown) => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6)
          : [],
        phase: body?.phase ?? null,
        notes: body?.notes ?? null,
        isActive: body?.isActive !== false,
        exercises: { create: exercises.map(mapExercise) },
      },
      include: { exercises: { orderBy: { order: "asc" } } },
    });
    return NextResponse.json(workout, { status: 201 });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/workouts] POST error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
