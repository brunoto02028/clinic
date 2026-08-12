import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET - List folders for the clinic, with active-exercise counts
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clinicId = (session.user as any)?.clinicId;

  const folders = await prisma.exerciseFolder.findMany({
    where: clinicId ? { clinicId } : {},
    orderBy: { name: "asc" },
    include: {
      _count: { select: { exercises: { where: { isActive: true } } } },
    },
  });

  return NextResponse.json({ folders });
}

// POST - Create a folder, or reuse an existing one with the same name
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clinicId = (session.user as any)?.clinicId;
  if (!clinicId) {
    return NextResponse.json({ error: "No clinic context" }, { status: 400 });
  }

  const { name } = await req.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const trimmed = name.trim();

  const existing = await prisma.exerciseFolder.findFirst({
    where: { clinicId, name: trimmed },
  });
  if (existing) {
    return NextResponse.json({ folder: existing });
  }

  const folder = await prisma.exerciseFolder.create({
    data: { clinicId, name: trimmed },
  });

  return NextResponse.json({ folder }, { status: 201 });
}
