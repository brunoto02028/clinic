export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, assertPatientAccess, accessErrorResponse, AccessError } from "@/lib/tenant-access";
import { assertTrainingAccess } from "@/lib/workout-access";

// NOTE: exercises are copied straight from WorkoutTemplateExercise without
// re-checking assertExercisesInTenant here. That's safe only because every
// current writer of WorkoutTemplateExercise (days/route.ts, duplicate/route.ts)
// already validates tenant ownership before it's created. If a new write path
// to WorkoutTemplateExercise is ever added without that check, this route
// would silently inherit the leak — re-validate here if that changes.

// Sunday-based weekday arithmetic to match Workout.daysOfWeek's convention
// (0=Sun … 6=Sat) and WorkoutTemplateDay.dayOfWeek. Uses UTC throughout (noon
// UTC anchor, like app/api/availability/route.ts) so the result doesn't
// depend on the server process's local timezone — daysOfWeek is a bare
// 0-6 integer with no timezone of its own, and scheduledDate must agree
// with it regardless of where the server happens to run.
function scheduledDateFor(startDate: Date, weekIndex: number, dayOfWeek: number): Date {
  const startDow = startDate.getUTCDay();
  const daysFromStart = weekIndex * 7 + ((dayOfWeek - startDow + 7) % 7);
  const d = new Date(startDate);
  d.setUTCDate(d.getUTCDate() + daysFromStart);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// POST — assign a template to one or more students at once, materializing a
// concrete Workout (+ its exercises) per student per template day. Each
// student's workouts are independent from here on — editing one afterwards
// never touches the template or another student (see T-4 for the opposite
// direction: pushing template edits back out).
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = await assertTrainingAccess(actor);

    const template = await prisma.workoutTemplate.findUnique({
      where: { id },
      include: { days: { include: { exercises: true } } },
    });
    if (!template || template.clinicId !== clinicId) throw new AccessError(404, "Not found");

    const body = await request.json().catch(() => null);
    const studentIds: unknown[] = Array.isArray(body?.studentIds) ? Array.from(new Set(body.studentIds)) : [];
    const startDateRaw = body?.startDate;
    if (!studentIds.length) return NextResponse.json({ error: "studentIds is required" }, { status: 400 });
    // Anchored to noon UTC (not just "new Date(startDateRaw)") so a plain
    // "YYYY-MM-DD" from a <input type="date"> resolves to the same calendar
    // day regardless of the server process's local timezone.
    const startDate = typeof startDateRaw === "string" ? new Date(`${startDateRaw}T12:00:00.000Z`) : new Date(NaN);
    if (!startDateRaw || Number.isNaN(startDate.getTime())) {
      return NextResponse.json({ error: "startDate must be a valid date" }, { status: 400 });
    }
    if (!template.days.length) {
      return NextResponse.json({ error: "This program has no days yet" }, { status: 400 });
    }

    const dayIds = template.days.map((d) => d.id);
    const assigned: string[] = [];
    const skipped: string[] = [];

    for (const rawId of studentIds) {
      if (typeof rawId !== "string" || !rawId) {
        skipped.push(String(rawId));
        continue;
      }
      // A student outside this tenant is silently skipped, never the whole
      // batch — and never surfaces *why* it was skipped (no enumeration
      // oracle for another tenant's user ids).
      try {
        await assertPatientAccess(actor, rawId);
      } catch {
        skipped.push(rawId);
        continue;
      }

      // Idempotency guard: a retry after a mid-batch failure, a double-click,
      // or two concurrent requests for the same student must not duplicate
      // their Workouts. If this student already has one from this template,
      // skip them rather than creating a second copy — there's no "restart
      // this program" flow yet, so ambiguity fails safe (skip) not (dupe).
      const already = await prisma.workout.findFirst({
        where: { studentId: rawId, templateDayId: { in: dayIds } },
        select: { id: true },
      });
      if (already) {
        skipped.push(rawId);
        continue;
      }

      try {
        await prisma.$transaction(
          template.days.map((day) =>
            prisma.workout.create({
              data: {
                clinicId,
                trainerId: actor.userId,
                studentId: rawId,
                name: day.name,
                phase: day.phase,
                daysOfWeek: [day.dayOfWeek],
                scheduledDate: scheduledDateFor(startDate, day.weekIndex, day.dayOfWeek),
                templateDayId: day.id,
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
            })
          )
        );
        assigned.push(rawId);
      } catch (err) {
        // One student's transaction failing (DB hiccup, etc.) must not abort
        // the whole batch — students already committed before this one stay
        // committed, and the rest of the list still gets a chance.
        console.error("[admin/workout-templates/:id/assign] student failed:", rawId, (err as any)?.message);
        skipped.push(rawId);
      }
    }

    return NextResponse.json({ assigned, skipped }, { status: 201 });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/workout-templates/:id/assign] POST error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
