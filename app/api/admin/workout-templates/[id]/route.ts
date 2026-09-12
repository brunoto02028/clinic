export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, accessErrorResponse, AccessError } from "@/lib/tenant-access";
import { assertTrainingAccess } from "@/lib/workout-access";

const MAX_WEEKS = 12;

async function loadOwnedTemplate(clinicId: string, id: string) {
  const template = await prisma.workoutTemplate.findUnique({ where: { id }, select: { clinicId: true } });
  if (!template || template.clinicId !== clinicId) throw new AccessError(404, "Not found");
}

// GET — template detail with days and exercises.
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = await assertTrainingAccess(actor);
    await loadOwnedTemplate(clinicId, id);

    const template = await prisma.workoutTemplate.findUnique({
      where: { id },
      include: {
        days: {
          orderBy: [{ weekIndex: "asc" }, { dayOfWeek: "asc" }, { order: "asc" }],
          include: {
            exercises: {
              orderBy: { order: "asc" },
              include: {
                exercise: { select: { id: true, name: true, namePt: true, videoUrl: true, thumbnailUrl: true } },
              },
            },
          },
        },
      },
    });
    return NextResponse.json(template);
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/workout-templates/:id] GET error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}

// PATCH — edit name/description/weeks/isActive.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = await assertTrainingAccess(actor);
    await loadOwnedTemplate(clinicId, id);

    const body = await request.json().catch(() => null);
    const data: Record<string, unknown> = {};

    if (body?.name !== undefined) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
      data.name = name;
    }
    if (body?.description !== undefined) {
      data.description = typeof body.description === "string" ? body.description.trim() || null : null;
    }
    if (body?.weeks !== undefined) {
      const weeks = Number(body.weeks);
      if (!Number.isInteger(weeks) || weeks < 1 || weeks > MAX_WEEKS) {
        return NextResponse.json({ error: `weeks must be an integer between 1 and ${MAX_WEEKS}` }, { status: 400 });
      }
      // Shrinking below a week that already has days would silently orphan
      // them (still in the DB, but outside the range the UI/other endpoints
      // treat as valid) — reject instead of guessing whether to delete them.
      const outOfRange = await prisma.workoutTemplateDay.count({ where: { templateId: id, weekIndex: { gte: weeks } } });
      if (outOfRange > 0) {
        return NextResponse.json(
          { error: `Cannot reduce to ${weeks} weeks: ${outOfRange} day(s) exist beyond that range. Remove them first.` },
          { status: 400 }
        );
      }
      data.weeks = weeks;
    }
    if (body?.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") {
        return NextResponse.json({ error: "isActive must be a boolean" }, { status: 400 });
      }
      data.isActive = body.isActive;
    }

    const template = await prisma.workoutTemplate.update({ where: { id }, data });
    return NextResponse.json(template);
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/workout-templates/:id] PATCH error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}

// DELETE — removes the template and its days/exercises. Workouts already
// assigned to students are untouched (their templateDayId is set to null).
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = await assertTrainingAccess(actor);
    await loadOwnedTemplate(clinicId, id);

    await prisma.workoutTemplate.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/workout-templates/:id] DELETE error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
