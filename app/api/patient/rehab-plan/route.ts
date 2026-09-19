import { NextRequest, NextResponse } from "next/server";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/patient/rehab-plan
// Returns the latest rehab plan that has been sent to the logged-in patient
export async function GET(req: NextRequest) {
  const effective = await getEffectiveUser();
  if (!effective || effective.role !== "PATIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const patientId = effective.userId;

  const plan = await (prisma as any).rehabPlan.findFirst({
    where: {
      patientId,
      sentToPatient: true,
    },
    orderBy: { sentAt: "desc" },
    select: {
      id: true,
      chiefComplaint: true,
      bodyPart: true,
      severity: true,
      phase: true,
      planJson: true,
      therapistNote: true,
      sentAt: true,
      createdAt: true,
      createdBy: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  return NextResponse.json({ plan: plan || null });
}
