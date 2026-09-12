export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, tenantWhere, accessErrorResponse, AccessError } from "@/lib/tenant-access";
import { assertTrainingAccess } from "@/lib/workout-access";

const MAX_WEEKS = 12;

// GET — list the tenant's workout templates (Program Templates, activity 33).
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertTrainingAccess(actor);

    const templates = await prisma.workoutTemplate.findMany({
      where: { ...tenantWhere(actor), isActive: true },
      include: {
        _count: { select: { days: true } },
        days: { select: { _count: { select: { exercises: true } } } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const result = templates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      weeks: t.weeks,
      dayCount: t._count.days,
      exerciseCount: t.days.reduce((sum, d) => sum + d._count.exercises, 0),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/workout-templates] GET error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}

// POST — create an empty template (days are added via /[id]/days).
export async function POST(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = await assertTrainingAccess(actor);

    const body = await request.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const weeks = Number(body?.weeks);
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    if (!Number.isInteger(weeks) || weeks < 1 || weeks > MAX_WEEKS) {
      return NextResponse.json({ error: `weeks must be an integer between 1 and ${MAX_WEEKS}` }, { status: 400 });
    }

    const template = await prisma.workoutTemplate.create({
      data: {
        clinicId,
        trainerId: actor.userId,
        name,
        description: typeof body?.description === "string" ? body.description.trim() || null : null,
        weeks,
      },
    });
    return NextResponse.json(template, { status: 201 });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/workout-templates] POST error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
