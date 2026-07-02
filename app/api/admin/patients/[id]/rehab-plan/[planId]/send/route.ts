import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["ADMIN", "SUPERADMIN", "STAFF"];

// POST /api/admin/patients/[id]/rehab-plan/[planId]/send
// Marks the plan as sent to patient with an optional therapist note
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; planId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { therapistNote } = await req.json();

  const plan = await (prisma as any).rehabPlan.findUnique({
    where: { id: params.planId },
    select: { id: true, patientId: true },
  });

  if (!plan || plan.patientId !== params.id) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const updated = await (prisma as any).rehabPlan.update({
    where: { id: params.planId },
    data: {
      sentToPatient: true,
      sentAt: new Date(),
      therapistNote: therapistNote?.trim() || null,
    },
  });

  return NextResponse.json({ plan: updated });
}

// DELETE — revoke (unsend)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; planId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await (prisma as any).rehabPlan.update({
    where: { id: params.planId },
    data: { sentToPatient: false, sentAt: null },
  });

  return NextResponse.json({ ok: true });
}
