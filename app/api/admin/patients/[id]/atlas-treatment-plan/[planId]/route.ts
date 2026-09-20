import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { staffPatientAccess } from "@/lib/staff-patient-access";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["ADMIN", "SUPERADMIN", "THERAPIST"];

// GET — poll a plan kicked off by POST .../atlas-treatment-plan (action: "generate")
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; planId: string } }
) {
  const tenantAccess = await staffPatientAccess(req, params.id);
  if (tenantAccess.response) return tenantAccess.response;

  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await prisma.atlasTreatmentPlan.findFirst({
    where: { id: params.planId, patientId: params.id },
  });
  if (!row) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  return NextResponse.json({
    id: row.id,
    status: row.status,
    plan: row.planJson,
    error: row.error,
  });
}
