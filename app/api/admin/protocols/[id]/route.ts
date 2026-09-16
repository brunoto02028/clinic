import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  staffTenantAccess,
  templateInTenant,
  clinicExerciseIds,
  templateItemsError,
  templateItemRows,
  TEMPLATE_NOT_FOUND,
} from "@/lib/protocol-template-access";

export const dynamic = "force-dynamic";

// GET — single template with items (caller's clinic only)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const access = await staffTenantAccess(req);
  if (access.response) return access.response;

  const template = await templateInTenant(params.id, access.actor.clinicId, {
    items: {
      orderBy: [{ phase: "asc" }, { sortOrder: "asc" }],
      include: { exercise: { select: { id: true, name: true, videoUrl: true, thumbnailUrl: true } } },
    },
  });
  if (!template) return NextResponse.json(TEMPLATE_NOT_FOUND, { status: 404 });
  return NextResponse.json(template);
}

// PATCH — update template (replaces items if provided)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const access = await staffTenantAccess(req);
  if (access.response) return access.response;
  const { clinicId } = access.actor;

  if (!(await templateInTenant(params.id, clinicId))) {
    return NextResponse.json(TEMPLATE_NOT_FOUND, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { name, description, condition, bodyRegion, equipment, category, estimatedWeeks, sessionsPerWeek, isActive, items } = body;
  if (items !== undefined) {
    const itemsError = templateItemsError(items);
    if (itemsError) return NextResponse.json({ error: itemsError }, { status: 400 });
  }

  const data: any = {};
  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description;
  if (condition !== undefined) data.condition = condition;
  if (bodyRegion !== undefined) data.bodyRegion = bodyRegion;
  if (equipment !== undefined) data.equipment = equipment;
  if (category !== undefined) data.category = category;
  if (estimatedWeeks !== undefined) data.estimatedWeeks = estimatedWeeks;
  if (sessionsPerWeek !== undefined) data.sessionsPerWeek = sessionsPerWeek;
  if (isActive !== undefined) data.isActive = isActive;

  if (items !== undefined) {
    // A template may only link exercises from its own clinic's library.
    const ownExercises = await clinicExerciseIds(items.map((it: any) => it?.exerciseId), clinicId);
    data.items = { deleteMany: {}, create: templateItemRows(items, ownExercises) };
  }

  const updated = await (prisma as any).protocolTemplate.update({
    where: { id: params.id },
    data,
    include: { items: { orderBy: [{ phase: "asc" }, { sortOrder: "asc" }] } },
  });

  return NextResponse.json(updated);
}

// DELETE — remove template (caller's clinic only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const access = await staffTenantAccess(req);
  if (access.response) return access.response;
  if (!(await templateInTenant(params.id, access.actor.clinicId))) {
    return NextResponse.json(TEMPLATE_NOT_FOUND, { status: 404 });
  }
  await (prisma as any).protocolTemplate.delete({ where: { id: params.id } });
  return NextResponse.json({ deleted: true });
}
