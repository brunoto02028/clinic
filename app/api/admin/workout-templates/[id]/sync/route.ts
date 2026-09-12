export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getActor, accessErrorResponse, AccessError } from "@/lib/tenant-access";
import { assertTrainingAccess } from "@/lib/workout-access";

async function loadOwnedTemplate(clinicId: string, id: string) {
  const template = await prisma.workoutTemplate.findUnique({ where: { id }, select: { clinicId: true } });
  if (!template || template.clinicId !== clinicId) throw new AccessError(404, "Not found");
}

// Workouts eligible for a sync push: linked to one of this template's days,
// scheduled today or later, and never logged (no WorkoutLog) — a student
// mid-session or already done never has their workout silently rewritten.
//
// "Today" is computed in UTC, not the server process's local timezone: the
// assign route stores scheduledDate as a UTC-midnight-anchored instant (see
// app/api/admin/workout-templates/[id]/assign/route.ts), so comparing against
// a *local* midnight would shift the cutoff by the server's UTC offset —
// in a negative-offset timezone that would wrongly exclude today's workouts.
async function eligibleWorkouts(templateId: string) {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return prisma.workout.findMany({
    where: {
      templateDay: { templateId },
      scheduledDate: { gte: today },
      logs: { none: {} },
    },
    select: { id: true, templateDayId: true },
  });
}

// GET — dry run: how many workouts would be updated vs. skipped, without
// changing anything. Used by the UI to show a confirmation count first.
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = await assertTrainingAccess(actor);
    await loadOwnedTemplate(clinicId, id);

    const [eligible, totalLinked] = await Promise.all([
      eligibleWorkouts(id),
      prisma.workout.count({ where: { templateDay: { templateId: id } } }),
    ]);
    return NextResponse.json({ willUpdate: eligible.length, willSkip: totalLinked - eligible.length });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/workout-templates/:id/sync] GET error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}

// POST — push the template's current content out to every eligible Workout.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = await assertTrainingAccess(actor);
    await loadOwnedTemplate(clinicId, id);

    const targets = await eligibleWorkouts(id);
    const dayIds = Array.from(new Set(targets.map((w) => w.templateDayId).filter(Boolean))) as string[];
    const days = await prisma.workoutTemplateDay.findMany({
      where: { id: { in: dayIds } },
      include: { exercises: true },
    });
    const dayById = new Map(days.map((d) => [d.id, d]));

    let updated = 0;
    for (const w of targets) {
      const day = w.templateDayId ? dayById.get(w.templateDayId) : undefined;
      if (!day) continue;
      try {
        // Serializable: two concurrent syncs of the same template (double
        // click, retry) would otherwise both delete-then-recreate the same
        // Workout's exercises under READ COMMITTED, each blind to the
        // other's not-yet-committed rows — duplicating WorkoutExercise.
        // Serializable makes one of them fail instead (caught below, that
        // workout just counts as skipped this round) rather than corrupt.
        await prisma.$transaction(
          [
            prisma.workoutExercise.deleteMany({ where: { workoutId: w.id } }),
            prisma.workout.update({
              where: { id: w.id },
              data: {
                name: day.name,
                phase: day.phase,
                exercises: {
                  create: day.exercises.map((e) => ({
                    exerciseId: e.exerciseId,
                    order: e.order,
                    supersetGroup: e.supersetGroup,
                    sets: e.sets,
                    repsMin: e.repsMin,
                    repsMax: e.repsMax,
                    loadKg: e.loadKg,
                    rpe: e.rpe,
                    rir: e.rir,
                    cadence: e.cadence,
                    restSeconds: e.restSeconds,
                    notes: e.notes,
                  })),
                },
              },
            }),
          ],
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        );
        updated++;
      } catch (err) {
        // One workout failing (serialization conflict, DB hiccup) must not
        // abort the rest of the sync — already-updated workouts stay updated,
        // and the remaining targets still get their turn.
        console.error("[admin/workout-templates/:id/sync] workout failed:", w.id, (err as any)?.message);
      }
    }

    const totalLinked = await prisma.workout.count({ where: { templateDay: { templateId: id } } });
    return NextResponse.json({ updated, skipped: totalLinked - updated });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/workout-templates/:id/sync] POST error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
