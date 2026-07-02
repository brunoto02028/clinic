import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/patient/rehab-plan
// Returns the latest rehab plan that has been sent to the logged-in patient
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const patientId = (session.user as any).id;

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
