import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["ADMIN", "SUPERADMIN", "STAFF"];

// GET /api/admin/patients/[id]/rehab-plan/[planId] — get single plan with messages
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; planId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plan = await (prisma as any).rehabPlan.findFirst({
    where: { id: params.planId, patientId: params.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      createdBy: { select: { name: true } },
    },
  });

  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(plan);
}

// PATCH /api/admin/patients/[id]/rehab-plan/[planId] — update status
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; planId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { status } = await req.json();
  const updated = await (prisma as any).rehabPlan.update({
    where: { id: params.planId },
    data: { status },
  });
  return NextResponse.json(updated);
}
