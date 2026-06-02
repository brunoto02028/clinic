import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET — List all course opportunities
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const category = searchParams.get("category");
  const type = searchParams.get("type");

  const where: any = {};
  if (status && status !== "all") where.status = status;
  if (category && category !== "all") where.category = category;
  if (type && type !== "all") where.type = type;

  const courses = await prisma.courseOpportunity.findMany({
    where,
    orderBy: [{ relevanceScore: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ courses });
}

// DELETE — Remove a course
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.courseOpportunity.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
