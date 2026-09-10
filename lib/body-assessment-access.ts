import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, isStaff, canAccessRecord, type Actor } from "@/lib/tenant-access";

// Every /api/admin/body-assessments/[id] handler starts here. An assessment of
// another tenant answers exactly like a missing one, so its existence isn't
// revealed.
export async function staffAssessmentAccess(
  request: NextRequest,
  assessmentId: string
): Promise<{ actor: Actor; response?: never } | { actor?: never; response: NextResponse }> {
  const actor = await getActor(request);
  if (!actor) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!isStaff(actor)) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const assessment = await prisma.bodyAssessment.findUnique({
    where: { id: assessmentId },
    select: { clinicId: true },
  });
  if (!assessment || !canAccessRecord(actor, assessment)) {
    return { response: NextResponse.json({ error: "Assessment not found" }, { status: 404 }) };
  }
  return { actor };
}
