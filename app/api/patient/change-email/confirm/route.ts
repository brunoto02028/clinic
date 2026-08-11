import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const changeToken = await prisma.emailChangeToken.findUnique({ where: { token } });

    if (!changeToken || changeToken.expires < new Date()) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    // Guard against a race where the new email got taken between request and confirm
    const existing = await prisma.user.findUnique({ where: { email: changeToken.newEmail } });
    if (existing && existing.id !== changeToken.userId) {
      await prisma.emailChangeToken.delete({ where: { id: changeToken.id } });
      return NextResponse.json({ error: "That email is no longer available." }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: changeToken.userId },
        data: { email: changeToken.newEmail },
      }),
      prisma.emailChangeToken.delete({ where: { id: changeToken.id } }),
    ]);

    return NextResponse.json({ message: "Email updated successfully", newEmail: changeToken.newEmail });
  } catch (error) {
    console.error("Confirm email change error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
