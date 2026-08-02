import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
const ALLOWED_ROLES = ["ADMIN", "SUPERADMIN", "STAFF", "THERAPIST"];

// GET — list custom task types
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const types = await (prisma as any).customTaskType.findMany({
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(types);
}

// POST — create a custom task type
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { name, namePt, defaultTitle, defaultTitlePt, defaultDescription, defaultDescriptionPt, actionUrl } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  const created = await (prisma as any).customTaskType.create({
    data: {
      clinicId: (session.user as any).clinicId || null,
      name: name.trim(),
      namePt: namePt || null,
      defaultTitle: defaultTitle || null,
      defaultTitlePt: defaultTitlePt || null,
      defaultDescription: defaultDescription || null,
      defaultDescriptionPt: defaultDescriptionPt || null,
      actionUrl: actionUrl || null,
      createdById: (session.user as any).id,
    },
  });
  return NextResponse.json(created, { status: 201 });
}

// DELETE — remove a custom task type
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await (prisma as any).customTaskType.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
