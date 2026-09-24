import { NextRequest, NextResponse } from "next/server";
import { getEffectiveUser } from "@/lib/get-effective-user";

export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/db";
import { patientGate } from "@/lib/patient-gate";

// GET - Get patient's body assessments (only sent/completed ones)
export async function GET(request: NextRequest) {
  // Consentimento e plano valem no servidor, não só na tela (auditoria de paridade, 24/09/2026).
  const __gate = await patientGate();
  if (__gate.response) return __gate.response;

  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId, role } = effectiveUser;
    if (!userId || role !== "PATIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assessments = await (prisma as any).bodyAssessment.findMany({
      where: {
        patientId: userId,
        status: { in: ["SENT_TO_PATIENT", "COMPLETED"] },
        sentToPatientAt: { not: null },
      },
      orderBy: { createdAt: "desc" },
      include: {
        therapist: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json(assessments);
  } catch (error) {
    console.error("Error fetching patient body assessments:", error);
    return NextResponse.json(
      { error: "Failed to fetch assessments" },
      { status: 500 }
    );
  }
}
