import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { resolveClinicId } from "@/lib/resolve-clinic-id";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["ADMIN", "SUPERADMIN", "STAFF", "THERAPIST"];

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const clinicId = await resolveClinicId(session);
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to   = searchParams.get("to");

  const blocks = await (prisma as any).therapistBlock.findMany({
    where: {
      clinicId,
      ...(from && to ? {
        OR: [
          { startDate: { lte: new Date(to) }, endDate: { gte: new Date(from) } },
        ],
      } : {}),
    },
    orderBy: { startDate: "asc" },
  });
  return NextResponse.json(blocks);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const clinicId = await resolveClinicId(session);
  const therapistId = (session.user as any).id;
  const { startDate, endDate, reason, blockType } = await req.json();

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "startDate and endDate required" }, { status: 400 });
  }
  if (new Date(endDate) < new Date(startDate)) {
    return NextResponse.json({ error: "endDate must be after startDate" }, { status: 400 });
  }

  const block = await (prisma as any).therapistBlock.create({
    data: {
      clinicId,
      therapistId,
      startDate: new Date(startDate),
      endDate:   new Date(endDate),
      reason:    reason || null,
      blockType: blockType || "ABSENCE",
    },
  });
  return NextResponse.json(block, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await (prisma as any).therapistBlock.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
