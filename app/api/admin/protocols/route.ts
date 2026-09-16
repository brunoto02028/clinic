import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  staffTenantAccess,
  clinicExerciseIds,
  templateItemsError,
  templateItemRows,
} from "@/lib/protocol-template-access";

export const dynamic = "force-dynamic";

// GET — list the caller's clinic's protocol templates
export async function GET(req: NextRequest) {
  const access = await staffTenantAccess(req);
  if (access.response) return access.response;

  const templates = await (prisma as any).protocolTemplate.findMany({
    where: { clinicId: access.actor.clinicId },
    include: {
      createdBy: { select: { firstName: true, lastName: true } },
      items: {
        orderBy: [{ phase: "asc" }, { sortOrder: "asc" }],
        include: { exercise: { select: { id: true, name: true, videoUrl: true, thumbnailUrl: true } } },
      },
      _count: { select: { items: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(templates);
}

// POST — create a new protocol template (with items) in the caller's clinic
export async function POST(req: NextRequest) {
  const access = await staffTenantAccess(req);
  if (access.response) return access.response;
  const { clinicId, userId } = access.actor;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { name, description, condition, bodyRegion, equipment = [], category, estimatedWeeks, sessionsPerWeek, items = [] } = body;
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  const itemsError = templateItemsError(items);
  if (itemsError) return NextResponse.json({ error: itemsError }, { status: 400 });
  // A template may only link exercises from its own clinic's library.
  const ownExercises = await clinicExerciseIds(items.map((it: any) => it?.exerciseId), clinicId);

  const template = await (prisma as any).protocolTemplate.create({
    data: {
      clinicId,
      name: name.trim(),
      description: description || null,
      condition: condition || null,
      bodyRegion: bodyRegion || null,
      equipment,
      category: category || null,
      estimatedWeeks: estimatedWeeks ?? null,
      sessionsPerWeek: sessionsPerWeek ?? null,
      createdById: userId,
      items: { create: templateItemRows(items, ownExercises) },
    },
    include: { items: true },
  });

  return NextResponse.json(template, { status: 201 });
}
