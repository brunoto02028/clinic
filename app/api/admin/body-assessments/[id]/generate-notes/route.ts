import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { callAI } from "@/lib/ai-provider";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: (session.user as any).id } });
    if (!user || !["ADMIN", "THERAPIST", "SUPERADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const language = body.language || "en";
    const isPt = language === "pt-BR";

    const assessment = await (prisma as any).bodyAssessment.findUnique({
      where: { id: params.id },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, dateOfBirth: true } },
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    // Gather patient screening data
    let screening: any = null;
    try {
      screening = await (prisma as any).medicalScreening.findFirst({
        where: { patientId: assessment.patientId },
        orderBy: { createdAt: "desc" },
      });
    } catch {}

    // Build context from all available data
    const patientName = `${assessment.patient.firstName} ${assessment.patient.lastName}`;
    const patientAge = assessment.patient.dateOfBirth
      ? Math.floor((Date.now() - new Date(assessment.patient.dateOfBirth).getTime()) / 31557600000)
      : null;

    const pa = assessment.postureAnalysis || {};
    const scores = {
      posture: assessment.postureScore,
      symmetry: assessment.symmetryScore,
      mobility: assessment.mobilityScore,
      overall: assessment.overallScore,
    };

    const contextParts: string[] = [];
    contextParts.push(`Patient: ${patientName}${patientAge ? `, ${patientAge} years old` : ""}`);

    if (screening) {
      if (screening.chiefComplaint) contextParts.push(`Chief Complaint: ${screening.chiefComplaint}`);
      if (screening.painLocation) contextParts.push(`Pain Location: ${screening.painLocation}`);
      if (screening.painIntensity) contextParts.push(`Pain Intensity: ${screening.painIntensity}/10`);
      if (screening.activityLevel) contextParts.push(`Activity Level: ${screening.activityLevel}`);
      if (screening.sportModality) contextParts.push(`Sport: ${screening.sportModality}`);
      if (screening.occupation) contextParts.push(`Occupation: ${screening.occupation}`);
      if (screening.dominantSide) contextParts.push(`Dominant Side: ${screening.dominantSide}`);
      if (screening.surgicalHistory) contextParts.push(`Surgical History: ${screening.surgicalHistory}`);
      if (screening.currentMedications) contextParts.push(`Medications: ${screening.currentMedications}`);
      if (screening.functionalLimitations) contextParts.push(`Functional Limitations: ${screening.functionalLimitations}`);
    }

    if (scores.overall) contextParts.push(`\nScores: Posture ${scores.posture}/100, Symmetry ${scores.symmetry}/100, Mobility ${scores.mobility}/100, Overall ${scores.overall}/100`);

    if (pa.executiveSummary) contextParts.push(`\nExecutive Summary: ${pa.executiveSummary}`);
    if (pa.biomechanicalIntegration) contextParts.push(`Biomechanical Integration: ${pa.biomechanicalIntegration}`);
    if (pa.functionalImpact) contextParts.push(`Functional Impact: ${pa.functionalImpact}`);
    if (pa.patientComplaintCorrelation) contextParts.push(`Complaint Correlation: ${pa.patientComplaintCorrelation}`);

    if (pa.muscleHypotheses) {
      const mh = pa.muscleHypotheses;
      if (mh.hypertonic?.length) contextParts.push(`Hypertonic Muscles: ${mh.hypertonic.map((m: any) => `${m.muscle} (${m.side || "bilateral"}) - ${m.severity}`).join(", ")}`);
      if (mh.hypotonic?.length) contextParts.push(`Hypotonic Muscles: ${mh.hypotonic.map((m: any) => `${m.muscle} (${m.side || "bilateral"}) - ${m.severity}`).join(", ")}`);
      if (mh.analysis) contextParts.push(`Muscle Analysis: ${mh.analysis}`);
    }

    if (assessment.aiFindings?.length) {
      contextParts.push(`\nFindings:\n${assessment.aiFindings.map((f: any) => `- ${f.area}: ${f.finding} (${f.severity})`).join("\n")}`);
    }

    if (pa.interventionPlan) {
      const ip = pa.interventionPlan;
      if (ip.phase1) contextParts.push(`Phase 1 (Acute): ${ip.phase1}`);
      if (ip.phase2) contextParts.push(`Phase 2 (Corrective): ${ip.phase2}`);
    }

    if (assessment.segmentScores) {
      const ss = assessment.segmentScores;
      const segments = Object.entries(ss).map(([k, v]: [string, any]) => `${k}: ${v.score}/100 (${v.status}) - ${v.keyIssue}`).join(", ");
      contextParts.push(`\nSegment Scores: ${segments}`);
    }

    const prompt = `You are an experienced senior physiotherapist (20+ years) writing detailed clinical notes for a biomechanical body assessment.

${isPt ? "Write ALL notes in Brazilian Portuguese (PT-BR). Use proper clinical terminology in Portuguese." : "Write ALL notes in English. Use proper clinical terminology."}

PATIENT DATA:
${contextParts.join("\n")}

Generate comprehensive clinical therapist notes that include:

1. **${isPt ? "Avaliação Clínica" : "Clinical Assessment"}**: Your professional interpretation of the findings, connecting the dots between different areas of dysfunction.

2. **${isPt ? "Correlação Biomecânica" : "Biomechanical Correlation"}**: How the findings relate to each other in the kinetic chain. Explain cause-and-effect patterns.

3. **${isPt ? "Hipóteses Clínicas" : "Clinical Hypotheses"}**: Your professional hypotheses about the root causes of the observed dysfunctions.

4. **${isPt ? "Plano de Tratamento Recomendado" : "Recommended Treatment Plan"}**: Specific treatment approaches (manual therapy, exercises, modalities) with rationale.

5. **${isPt ? "Metas de Reabilitação" : "Rehabilitation Goals"}**: Short-term (2-4 weeks) and long-term (8-12 weeks) measurable goals.

6. **${isPt ? "Precauções e Contraindicações" : "Precautions & Contraindications"}**: Any red flags or precautions based on the patient's history and findings.

7. **${isPt ? "Orientações ao Paciente" : "Patient Instructions"}**: Key recommendations for the patient (posture corrections, ergonomic advice, activity modifications).

${screening?.chiefComplaint ? `\nIMPORTANT: Always correlate findings with the patient's chief complaint: "${screening.chiefComplaint}"` : ""}

Write in a professional but clear clinical style. Be specific and evidence-based. Use proper anatomical terminology. The notes should be thorough enough to serve as a complete clinical record.`;

    const result = await callAI(prompt, { maxTokens: 4000 });

    return NextResponse.json({ notes: result, language });
  } catch (error: any) {
    console.error("Error generating notes:", error);
    return NextResponse.json({ error: error.message || "Failed to generate notes" }, { status: 500 });
  }
}
