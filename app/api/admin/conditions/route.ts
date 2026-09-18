import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { tenantStaff, ownedByTenant, pickCatalogFields } from "@/lib/tenant-owned";

const CONDITION_FIELDS = ["nameEn","namePt","slug","descriptionEn","descriptionPt","bodyRegion","category","icdCode","iconEmoji","isActive","sortOrder"] as const;

export const dynamic = 'force-dynamic';

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// GET — list all conditions
export async function GET(req: NextRequest) {
  const actor = await tenantStaff(req, ["ADMIN", "SUPERADMIN", "THERAPIST"]);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const clinicId = actor.clinicId;
  const conditions = await (prisma as any).condition.findMany({
    where: { clinicId },
    orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
    include: { _count: { select: { quizzes: true, achievements: true } } },
  });
  return NextResponse.json({ conditions });
}

// POST — create a condition
export async function POST(req: NextRequest) {
  const actor = await tenantStaff(req, ["ADMIN", "SUPERADMIN", "THERAPIST"]);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const clinicId = actor.clinicId;
  const userId = actor.userId;
  const body = await req.json();

  const { nameEn, namePt, descriptionEn, descriptionPt, bodyRegion, category, icdCode, iconEmoji } = body;
  if (!nameEn || !namePt) {
    return NextResponse.json({ error: "nameEn and namePt are required" }, { status: 400 });
  }

  let slug = slugify(nameEn);
  const existing = await (prisma as any).condition.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now()}`;

  const condition = await (prisma as any).condition.create({
    data: {
      clinicId,
      createdById: userId,
      nameEn,
      namePt,
      slug,
      descriptionEn: descriptionEn || null,
      descriptionPt: descriptionPt || null,
      bodyRegion: bodyRegion || null,
      category: category || null,
      icdCode: icdCode || null,
      iconEmoji: iconEmoji || null,
    },
  });

  return NextResponse.json({ condition });
}

// PATCH — update a condition
export async function PATCH(req: NextRequest) {
  const actor = await tenantStaff(req, ["ADMIN", "SUPERADMIN", "THERAPIST"]);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const body = await req.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (!(await ownedByTenant("condition", id, actor.clinicId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const picked = await pickCatalogFields(body, CONDITION_FIELDS, actor.clinicId);
  if ("error" in picked) return NextResponse.json({ error: picked.error }, { status: 404 });
  const data = picked.data;

  const condition = await (prisma as any).condition.update({
    where: { id },
    data,
  });
  return NextResponse.json({ condition });
}

// DELETE — delete a condition
export async function DELETE(req: NextRequest) {
  const actor = await tenantStaff(req, ["ADMIN", "SUPERADMIN"]);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (!(await ownedByTenant("condition", id, actor.clinicId))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await (prisma as any).condition.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
