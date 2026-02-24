import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/journey/challenges — List all challenges
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;

    const challenges = await (prisma as any).weeklyChallenge.findMany({
      where: clinicId ? { clinicId } : {},
      orderBy: { startsAt: "desc" },
    });

    return NextResponse.json({ challenges });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/journey/challenges — Create a challenge
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    const { title, description, target, reward, rewardCredits, startsAt, endsAt } = await req.json();

    if (!title || !target || !reward || !startsAt || !endsAt) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const challenge = await (prisma as any).weeklyChallenge.create({
      data: {
        clinicId,
        title,
        description: description || null,
        target: parseInt(target),
        reward,
        rewardCredits: parseInt(rewardCredits || "0"),
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        isActive: true,
      },
    });

    return NextResponse.json({ challenge });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/journey/challenges — Update a challenge
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id, ...data } = await req.json();
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.target !== undefined) updateData.target = parseInt(data.target);
    if (data.reward !== undefined) updateData.reward = data.reward;
    if (data.rewardCredits !== undefined) updateData.rewardCredits = parseInt(data.rewardCredits);
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.current !== undefined) updateData.current = parseInt(data.current);

    const challenge = await (prisma as any).weeklyChallenge.update({ where: { id }, data: updateData });
    return NextResponse.json({ challenge });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/journey/challenges — Delete a challenge
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await (prisma as any).weeklyChallenge.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
