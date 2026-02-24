import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// GET — list all conditions
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ADMIN", "SUPERADMIN", "THERAPIST"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const clinicId = (session.user as any).clinicId;
  const conditions = await (prisma as any).condition.findMany({
    where: { clinicId },
    orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
    include: { _count: { select: { quizzes: true, achievements: true } } },
  });
  return NextResponse.json({ conditions });
}

// POST — create a condition
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ADMIN", "SUPERADMIN", "THERAPIST"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const clinicId = (session.user as any).clinicId;
  const userId = (session.user as any).id;
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
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ADMIN", "SUPERADMIN", "THERAPIST"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const condition = await (prisma as any).condition.update({
    where: { id },
    data,
  });
  return NextResponse.json({ condition });
}

// DELETE — delete a condition
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ADMIN", "SUPERADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await (prisma as any).condition.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
