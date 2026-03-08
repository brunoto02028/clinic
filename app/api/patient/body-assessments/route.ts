import { NextRequest, NextResponse } from "next/server";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { prisma } from "@/lib/db";

// GET - Get patient's body assessments (only sent/completed ones)
export async function GET(request: NextRequest) {
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
