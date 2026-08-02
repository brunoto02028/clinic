import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["ADMIN", "SUPERADMIN", "STAFF"];

// GET /api/admin/rehab-plans/recent — last 20 plans across all patients
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plans = await (prisma as any).rehabPlan.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      patientId: true,
      chiefComplaint: true,
      bodyPart: true,
      severity: true,
      phase: true,
      status: true,
      createdAt: true,
      patient: {
        select: { id: true, firstName: true, lastName: true, name: true },
      },
    },
  });

  return NextResponse.json(plans);
}
