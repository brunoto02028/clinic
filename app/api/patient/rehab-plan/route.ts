import { NextRequest, NextResponse } from "next/server";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { prisma } from "@/lib/db";
import { patientGate } from "@/lib/patient-gate";

export const dynamic = "force-dynamic";

// GET /api/patient/rehab-plan
// Returns the latest rehab plan that has been sent to the logged-in patient
export async function GET(req: NextRequest) {
  // Consentimento e plano valem no servidor, não só na tela (auditoria de paridade, 24/09/2026).
  const __gate = await patientGate({ module: "mod_treatment" });
  if (__gate.response) return __gate.response;

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
