import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { callAIClinical } from "@/lib/ai-provider";
import { patientPseudonym, ageBand } from "@/lib/pseudonymize";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN", "THERAPIST"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { patientId, language } = await req.json();

  if (!patientId) {
    return NextResponse.json({ error: "Patient ID is required" }, { status: 400 });
  }

  // Fetch comprehensive patient data
  const patient: any = await prisma.user.findUnique({
    where: { id: patientId },
    include: {
      medicalScreening: true,
      soapNotesFor: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      patientAppointments: {
        orderBy: { dateTime: "desc" },
        take: 20,
      },
    },
  });

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  // Build comprehensive patient timeline
  const lang = language === "pt" ? "Portuguese (Brazil)" : "English";

  let patientData = `PATIENT: ${patientPseudonym(patientId)}
Created account: ${patient.createdAt ? new Date(patient.createdAt).toLocaleDateString("en-GB") : "Unknown"}
${patient.dateOfBirth ? `Age band: ${ageBand(patient.dateOfBirth) || "unknown"}` : ""}
`;

  // Medical screening
  if (patient.medicalScreening?.responses) {
    patientData += `\nMEDICAL SCREENING (completed ${patient.medicalScreening.completedAt ? new Date(patient.medicalScreening.completedAt).toLocaleDateString("en-GB") : "date unknown"}):\n`;
    patientData += JSON.stringify(patient.medicalScreening.responses, null, 1).slice(0, 3000);
  }

  // SOAP Notes history
  if (patient.soapNotesFor?.length > 0) {
    patientData += `\n\nCLINICAL NOTES HISTORY (${patient.soapNotesFor.length} notes):\n`;
    patient.soapNotesFor.forEach((note: any, i: number) => {
      const date = new Date(note.createdAt).toLocaleDateString("en-GB");
      patientData += `\n--- Session ${i + 1} (${date}) ---`;
      patientData += `\nSubjective: ${note.subjective}`;
      patientData += `\nObjective: ${note.objective}`;
      patientData += `\nAssessment: ${note.assessment}`;
      patientData += `\nPlan: ${note.plan}`;
      if (note.painLevel !== null) patientData += `\nPain: ${note.painLevel}/10`;
      if (note.rangeOfMotion) patientData += `\nROM: ${note.rangeOfMotion}`;
      if (note.treatmentNotes) patientData += `\nTreatment: ${note.treatmentNotes}`;
      patientData += "\n";
    });
  }

  // Appointments
  if (patient.patientAppointments?.length > 0) {
    patientData += `\n\nAPPOINTMENT HISTORY (${patient.patientAppointments.length} appointments):\n`;
    patient.patientAppointments.forEach((apt: any) => {
      const date = new Date(apt.dateTime).toLocaleDateString("en-GB");
      patientData += `- ${date}: ${apt.type || "General"} (${apt.status})${apt.notes ? ` — ${apt.notes.slice(0, 100)}` : ""}\n`;
    });
  }

  const prompt = `You are a senior clinical analyst AI for Bruno Physical Rehabilitation (BPR), a physical rehabilitation clinic.

Analyse the following COMPLETE patient record and provide a comprehensive clinical intelligence report.

${patientData}

GENERATE A COMPREHENSIVE REPORT with the following sections:

1. **PATIENT SUMMARY** — Brief overview of the patient, their primary conditions, and treatment history
2. **PROGRESS ANALYSIS** — How the patient has progressed over time (improving/plateauing/declining). Include pain trend, ROM improvements, functional gains.
3. **PATTERN RECOGNITION** — Any patterns in their presentations (recurring issues, seasonal patterns, treatment response patterns)
4. **RISK ALERTS** — Red flags, non-compliance indicators, chronicity risk, psychosocial factors
5. **TREATMENT EFFECTIVENESS** — Which treatments have worked best for this patient, what hasn't worked
6. **RECOMMENDATIONS** — Evidence-based suggestions for the next phase of treatment:
   - Modified treatment approach
   - Modalities to consider (laser, shockwave, dry needling, etc.)
   - Exercise progression
   - Referral suggestions if needed
   - Discharge criteria
7. **PREDICTED OUTCOMES** — Expected trajectory based on current progress and evidence base
8. **KEY METRICS** — Quantified summary:
   - Treatment adherence %
   - Pain reduction trend
   - Functional improvement %
   - Sessions to expected discharge

Write in ${lang}. Be specific and clinical. Use evidence-based reasoning.

Return a JSON object:
{
  "summary": "2-3 sentence patient overview",
  "progress": {"status": "improving|plateauing|declining", "details": "explanation", "painTrend": "description of pain trajectory"},
  "patterns": ["array of identified patterns"],
  "risks": [{"flag": "description", "severity": "high|medium|low", "action": "recommended action"}],
  "treatmentEffectiveness": {"effective": ["treatments that worked"], "ineffective": ["treatments that didn't work"], "untried": ["modalities not yet tried that could help"]},
  "recommendations": ["specific actionable recommendations"],
  "predictedOutcome": "expected trajectory",
  "metrics": {"adherence": "% or description", "painReduction": "trend", "functionalImprovement": "assessment", "estimatedSessionsRemaining": number or "ongoing"}
}

Return ONLY the JSON object, no markdown.`;

  try {
    const rawResponse = await callAIClinical(prompt, {
      temperature: 0.3,
      maxTokens: 6144,
    });

    let result;
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        result = JSON.parse(jsonMatch[0]);
      } catch {
        const cleaned = rawResponse.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
        const retryMatch = cleaned.match(/\{[\s\S]*\}/);
        if (retryMatch) result = JSON.parse(retryMatch[0]);
      }
    }

    if (!result || !result.summary) {
      return NextResponse.json({ error: "Failed to generate patient intelligence report." }, { status: 422 });
    }

    return NextResponse.json({
      report: result,
      patientName: `${patient.firstName} ${patient.lastName}`,
      notesAnalysed: patient.soapNotesFor?.length || 0,
      appointmentsAnalysed: patient.patientAppointments?.length || 0,
    });
  } catch (error: any) {
    console.error("[patient-intelligence] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
