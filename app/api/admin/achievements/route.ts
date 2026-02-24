import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

// GET — list all achievements
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ADMIN", "SUPERADMIN", "THERAPIST"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const clinicId = (session.user as any).clinicId;
  const { searchParams } = new URL(req.url);
  const conditionId = searchParams.get("conditionId");

  const where: any = { clinicId };
  if (conditionId) where.conditionId = conditionId;

  const achievements = await (prisma as any).achievement.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: {
      condition: { select: { id: true, nameEn: true, namePt: true, iconEmoji: true } },
      _count: { select: { patientAchievements: true } },
    },
  });
  return NextResponse.json({ achievements });
}

// POST — create achievement
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ADMIN", "SUPERADMIN", "THERAPIST"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const clinicId = (session.user as any).clinicId;
  const userId = (session.user as any).id;
  const body = await req.json();

  const { titleEn, titlePt, descriptionEn, descriptionPt, conditionId, category, triggerType, triggerValue, xpReward, iconEmoji, badgeColor, isPublished } = body;
  if (!titleEn || !titlePt) {
    return NextResponse.json({ error: "titleEn and titlePt are required" }, { status: 400 });
  }

  const achievement = await (prisma as any).achievement.create({
    data: {
      clinicId,
      createdById: userId,
      titleEn,
      titlePt,
      descriptionEn: descriptionEn || null,
      descriptionPt: descriptionPt || null,
      conditionId: conditionId || null,
      category: category || "general",
      triggerType: triggerType || "manual",
      triggerValue: triggerValue || null,
      xpReward: xpReward || 50,
      iconEmoji: iconEmoji || "🏆",
      badgeColor: badgeColor || "#8B5CF6",
      isPublished: isPublished ?? false,
    },
    include: { condition: true },
  });

  return NextResponse.json({ achievement });
}

// PATCH — update achievement
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ADMIN", "SUPERADMIN", "THERAPIST"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const achievement = await (prisma as any).achievement.update({
    where: { id },
    data,
    include: { condition: true },
  });
  return NextResponse.json({ achievement });
}

// DELETE — delete achievement
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ADMIN", "SUPERADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await (prisma as any).achievement.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
