export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ hasPhone: false });

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });
    return NextResponse.json({ hasPhone: !!(user?.phone) });
  } catch {
    return NextResponse.json({ hasPhone: false });
  }
}
