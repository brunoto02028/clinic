import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from '@/lib/get-effective-user';
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = effectiveUser.userId;
    const { currentPassword, newPassword } = await req.json();

    if (!newPassword) {
      return NextResponse.json({ error: "New password is required." }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "New password must be at least 6 characters." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // If currentPassword provided, verify it (optional — patient can skip)
    if (currentPassword) {
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[change-password] Error:", err);
    return NextResponse.json({ error: "Failed to change password." }, { status: 500 });
  }
}
