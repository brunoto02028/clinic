import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { preAssess } from "@/lib/rehab-agent";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["ADMIN", "SUPERADMIN", "STAFF"];

// POST /api/admin/patients/[id]/rehab-plan/pre-assess
// Stateless — sends Atlas's next message based on triage + chat history
// No DB write; chat lives in client state until plan is generated
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { patientContext = {}, messages = [] } = body;

  // Enrich context from patient screening if not already provided
  if (!patientContext.chiefComplaint || !patientContext.bodyPart) {
    try {
      const patient = await (prisma as any).user.findUnique({
        where: { id: params.id },
        select: {
          firstName: true,
          lastName: true,
          profile: { select: { dateOfBirth: true, gender: true, occupation: true } },
          screenings: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              chiefComplaint: true,
              bodyPart: true,
              injuryDuration: true,
              mechanism: true,
              aggravatingFactors: true,
              relievingFactors: true,
              relevantHistory: true,
              activityLevel: true,
            },
          },
          bodyAssessments: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { aiNotes: true, summary: true },
          },
        },
      });

      if (patient) {
        const screening = patient.screenings?.[0];
        const assessment = patient.bodyAssessments?.[0];
        if (!patientContext.name)
          patientContext.name = `${patient.firstName || ""} ${patient.lastName || ""}`.trim();
        if (!patientContext.chiefComplaint && screening?.chiefComplaint)
          patientContext.chiefComplaint = screening.chiefComplaint;
        if (!patientContext.bodyPart && screening?.bodyPart)
          patientContext.bodyPart = screening.bodyPart;
        if (!patientContext.duration && screening?.injuryDuration)
          patientContext.duration = screening.injuryDuration;
        if (!patientContext.mechanism && screening?.mechanism)
          patientContext.mechanism = screening.mechanism;
        if (!patientContext.aggravatingFactors && screening?.aggravatingFactors)
          patientContext.aggravatingFactors = screening.aggravatingFactors;
        if (!patientContext.relievingFactors && screening?.relievingFactors)
          patientContext.relievingFactors = screening.relievingFactors;
        if (!patientContext.relevantHistory && screening?.relevantHistory)
          patientContext.relevantHistory = screening.relevantHistory;
        if (!patientContext.activityLevel && screening?.activityLevel)
          patientContext.activityLevel = screening.activityLevel;
        if (!patientContext.assessmentFindings && (assessment?.aiNotes || assessment?.summary))
          patientContext.assessmentFindings = assessment.aiNotes || assessment.summary;
      }
    } catch {
      // Non-fatal — proceed with whatever context was provided
    }
  }

  const reply = await preAssess(patientContext, messages);
  return NextResponse.json({ reply });
}
