import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
const ALLOWED_ROLES = ["ADMIN", "SUPERADMIN", "STAFF", "THERAPIST"];

// GET — list protocol templates
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const templates = await (prisma as any).protocolTemplate.findMany({
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

// POST — create a new protocol template (with items)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, description, condition, bodyRegion, equipment = [], category, estimatedWeeks, sessionsPerWeek, items = [] } = body;
  if (!name?.trim()) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const template = await (prisma as any).protocolTemplate.create({
    data: {
      name: name.trim(),
      description: description || null,
      condition: condition || null,
      bodyRegion: bodyRegion || null,
      equipment,
      category: category || null,
      estimatedWeeks: estimatedWeeks ?? null,
      sessionsPerWeek: sessionsPerWeek ?? null,
      createdById: (session.user as any).id,
      items: {
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
      },
    },
    include: { items: true },
  });

  return NextResponse.json(template, { status: 201 });
}
