export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, accessErrorResponse, AccessError } from "@/lib/tenant-access";
import { assertTrainingAccess, assertExercisesInTenant, validateExercises, type WorkoutExerciseInput } from "@/lib/workout-access";

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

async function loadOwnedTemplate(clinicId: string, id: string) {
  const template = await prisma.workoutTemplate.findUnique({
    where: { id },
    select: { clinicId: true, weeks: true },
  });
  if (!template || template.clinicId !== clinicId) throw new AccessError(404, "Not found");
  return template;
}

// POST — create or replace a single day (identified by weekIndex+dayOfWeek)
// of the template, with its exercises. Used by the calendar editor: each grid
// cell maps to one call here. Upsert semantics: saving the same cell again
// replaces its exercises rather than duplicating the day row.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = await assertTrainingAccess(actor);
    const template = await loadOwnedTemplate(clinicId, id);

    const body = await request.json().catch(() => null);
    const weekIndex = Number(body?.weekIndex);
    const dayOfWeek = Number(body?.dayOfWeek);
    const name = typeof body?.name === "string" ? body.name.trim() : "";

    if (!Number.isInteger(weekIndex) || weekIndex < 0 || weekIndex >= template.weeks) {
      return NextResponse.json({ error: `weekIndex must be an integer between 0 and ${template.weeks - 1}` }, { status: 400 });
    }
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      return NextResponse.json({ error: "dayOfWeek must be an integer between 0 and 6" }, { status: 400 });
    }
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    const exercises: WorkoutExerciseInput[] = Array.isArray(body?.exercises) ? body.exercises : [];
    const vErr = validateExercises(exercises);
    if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });
    const ownErr = await assertExercisesInTenant(clinicId, exercises);
    if (ownErr) return NextResponse.json({ error: ownErr }, { status: 400 });

    const phase = typeof body?.phase === "string" ? body.phase.trim() || null : null;

    // Upsert on the (templateId, weekIndex, dayOfWeek) unique key: Postgres
    // turns this into an atomic INSERT ... ON CONFLICT DO UPDATE, so two
    // concurrent saves of the same cell never create duplicate day rows.
    const day = await prisma.workoutTemplateDay.upsert({
      where: { templateId_weekIndex_dayOfWeek: { templateId: id, weekIndex, dayOfWeek } },
      create: {
        templateId: id,
        weekIndex,
        dayOfWeek,
        name,
        phase,
        order: dayOfWeek,
        exercises: { create: exercises.map(mapExercise) },
      },
      update: {
        name,
        phase,
        exercises: { deleteMany: {}, create: exercises.map(mapExercise) },
      },
      include: { exercises: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json(day, { status: 200 });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/workout-templates/:id/days] POST error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
