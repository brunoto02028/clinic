import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST — Register/update a push device token
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { token, platform } = await req.json();

  if (!token || !platform) {
    return NextResponse.json({ error: "token and platform required" }, { status: 400 });
  }

  // Upsert: if token exists for this user, update it; otherwise create
  await (prisma as any).pushDeviceToken.upsert({
    where: { userId_token: { userId, token } },
    update: { active: true, platform, updatedAt: new Date() },
    create: { userId, token, platform, active: true },
  });

  return NextResponse.json({ success: true });
}

// DELETE — Deactivate a push token (e.g. on logout)
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { token } = await req.json();

  if (token) {
    await (prisma as any).pushDeviceToken.updateMany({
      where: { userId, token },
      data: { active: false },
    });
  } else {
    // Deactivate all tokens for this user
    await (prisma as any).pushDeviceToken.updateMany({
      where: { userId },
      data: { active: false },
    });
  }

  return NextResponse.json({ success: true });
}
