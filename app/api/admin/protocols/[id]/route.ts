import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
const ALLOWED_ROLES = ["ADMIN", "SUPERADMIN", "STAFF", "THERAPIST"];

// GET — single template with items
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const template = await (prisma as any).protocolTemplate.findUnique({
    where: { id: params.id },
    include: {
      items: {
        orderBy: [{ phase: "asc" }, { sortOrder: "asc" }],
        include: { exercise: { select: { id: true, name: true, videoUrl: true, thumbnailUrl: true } } },
      },
    },
  });
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(template);
}

// PATCH — update template (replaces items if provided)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, description, condition, bodyRegion, equipment, category, estimatedWeeks, sessionsPerWeek, isActive, items } = body;

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
    await (prisma as any).protocolTemplateItem.deleteMany({ where: { templateId: params.id } });
    data.items = {
      create: items.map((it: any, idx: number) => ({
        phase: it.phase || "SHORT_TERM",
        itemType: it.itemType || "HOME_EXERCISE",
        sortOrder: it.sortOrder ?? idx,
        title: it.title,
        description: it.description || null,
        instructions: it.instructions || null,
        treatmentTypeName: it.treatmentTypeName || null,
        sessionDuration: it.sessionDuration ?? null,
        sessionsPerWeek: it.sessionsPerWeek ?? null,
        exerciseId: it.exerciseId || null,
        sets: it.sets ?? null,
        reps: it.reps ?? null,
        holdSeconds: it.holdSeconds ?? null,
        restSeconds: it.restSeconds ?? null,
        frequency: it.frequency || null,
        startWeek: it.startWeek ?? 1,
        endWeek: it.endWeek ?? null,
      })),
    };
  }

  const updated = await (prisma as any).protocolTemplate.update({
    where: { id: params.id },
    data,
    include: { items: { orderBy: [{ phase: "asc" }, { sortOrder: "asc" }] } },
  });

  return NextResponse.json(updated);
}

// DELETE — remove template
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await (prisma as any).protocolTemplate.delete({ where: { id: params.id } });
  return NextResponse.json({ deleted: true });
}
