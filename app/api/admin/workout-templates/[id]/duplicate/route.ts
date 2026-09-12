export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, accessErrorResponse, AccessError } from "@/lib/tenant-access";
import { assertTrainingAccess } from "@/lib/workout-access";

// POST — clone a template (all days + exercises). The copy is fully
// independent: editing it never touches the original.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = await assertTrainingAccess(actor);

    const source = await prisma.workoutTemplate.findUnique({
      where: { id },
      include: { days: { include: { exercises: true } } },
    });
    if (!source || source.clinicId !== clinicId) throw new AccessError(404, "Not found");

    const copy = await prisma.workoutTemplate.create({
      data: {
        clinicId,
        trainerId: actor.userId,
        name: `${source.name} (copy)`,
        description: source.description,
        weeks: source.weeks,
        days: {
          create: source.days.map((d) => ({
            weekIndex: d.weekIndex,
            dayOfWeek: d.dayOfWeek,
            name: d.name,
            phase: d.phase,
            order: d.order,
            exercises: {
              create: d.exercises.map((e) => ({
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
          })),
        },
      },
    });

    return NextResponse.json(copy, { status: 201 });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/workout-templates/:id/duplicate] POST error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
