import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { preAssess } from "@/lib/rehab-agent";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["ADMIN", "SUPERADMIN", "STAFF"];

// POST /api/admin/patients/[id]/rehab-plan/pre-assess
// Stateless — Atlas receives FULL patient profile and chat history on every call
// No DB write; conversation lives in client state until plan is generated
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { messages = [] } = body;

  // ─── Fetch complete patient clinical profile ───────────────────────────────
  let patientBrief = "";
  try {
    const patient = await (prisma as any).user.findUnique({
      where: { id: params.id },
      select: {
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        // Medical screening (single record per patient)
        medicalScreening: {
          select: {
            chiefComplaint: true,
            painLocation: true,
            painDuration: true,
            painScore: true,
            painAggravating: true,
            painRelieving: true,
            painType: true,
            activityLevel: true,
            hobbiesSports: true,
            functionalLimitations: true,
            currentMedications: true,
            surgicalHistory: true,
            otherConditions: true,
            treatmentGoals: true,
            // Red flags
            unexplainedWeightLoss: true,
            nightPain: true,
            neurologicalSymptoms: true,
            cardiovascularSymptoms: true,
            createdAt: true,
          },
        },
        // Latest body assessment
        bodyAssessmentsAsPatient: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            aiSummary: true,
            aiRecommendations: true,
            therapistNotes: true,
            postureScore: true,
            symmetryScore: true,
            overallScore: true,
            createdAt: true,
          },
        },
        // Last 3 SOAP notes
        soapNotesFor: {
          orderBy: { createdAt: "desc" },
          take: 3,
          select: {
            subjective: true,
            objective: true,
            assessment: true,
            plan: true,
            painLevel: true,
            rangeOfMotion: true,
            functionalTests: true,
            createdAt: true,
          },
        },
        // Latest AI diagnosis
        diagnosesAsPatient: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            summary: true,
            conditions: true,
            riskFactors: true,
            recommendations: true,
            createdAt: true,
          },
        },
        // Previous rehab plans
        rehabPlansAsPatient: {
          orderBy: { createdAt: "desc" },
          take: 3,
          select: {
            chiefComplaint: true,
            bodyPart: true,
            severity: true,
            phase: true,
            status: true,
            planJson: true,
            createdAt: true,
          },
        },
        // Recent check-ins
        dailyCheckIns: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            painLevel: true,
            moodLevel: true,
            energyLevel: true,
            notes: true,
            createdAt: true,
          },
        },
      },
    });

    if (patient) {
      const age = patient.dateOfBirth
        ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()
        : null;
      const s = patient.medicalScreening;
      const ba = patient.bodyAssessmentsAsPatient?.[0];
      const dx = patient.diagnosesAsPatient?.[0];
      const soaps = patient.soapNotesFor || [];
      const prevPlans = patient.rehabPlansAsPatient || [];
      const checkIns = patient.dailyCheckIns || [];

      const lines: string[] = [
        "=== PATIENT CLINICAL PROFILE ===",
        `Name: ${patient.firstName || ""} ${patient.lastName || ""}`.trim(),
        age ? `Age: ${age}` : "",
        s?.occupation ? `Occupation: ${s.occupation}` : "",
        "",
      ];

      if (s) {
        const redFlags: string[] = [];
        if (s.unexplainedWeightLoss) redFlags.push("unexplained weight loss");
        if (s.nightPain) redFlags.push("night pain");
        if (s.neurologicalSymptoms) redFlags.push("neurological symptoms");
        if (s.cardiovascularSymptoms) redFlags.push("cardiovascular symptoms");

        lines.push(
          "--- MEDICAL SCREENING ---",
          s.chiefComplaint ? `Chief complaint: ${s.chiefComplaint}` : "",
          s.painLocation ? `Pain location: ${s.painLocation}` : "",
          s.painDuration ? `Duration: ${s.painDuration}` : "",
          s.painScore != null ? `Pain score (VAS): ${s.painScore}/10` : "",
          s.painType ? `Pain type: ${s.painType}` : "",
          s.activityLevel ? `Activity level: ${s.activityLevel}` : "",
          s.hobbiesSports ? `Sports/hobbies: ${s.hobbiesSports}` : "",
          s.painAggravating ? `Aggravating: ${s.painAggravating}` : "",
          s.painRelieving ? `Relieving: ${s.painRelieving}` : "",
          s.functionalLimitations ? `Functional limitations: ${s.functionalLimitations}` : "",
          s.currentMedications ? `Medications: ${s.currentMedications}` : "",
          s.surgicalHistory ? `Surgical history: ${s.surgicalHistory}` : "",
          s.otherConditions ? `Other conditions: ${s.otherConditions}` : "",
          s.treatmentGoals ? `Patient goals: ${s.treatmentGoals}` : "",
          redFlags.length > 0 ? `⚠️ RED FLAGS PRESENT: ${redFlags.join(", ")}` : "",
          `Screening date: ${new Date(s.createdAt).toLocaleDateString("en-GB")}`,
          "",
        );
      }

      if (ba) {
        lines.push(
          "--- BODY ASSESSMENT ---",
          ba.overallScore != null ? `Overall score: ${ba.overallScore}/100` : "",
          ba.postureScore != null ? `Posture score: ${ba.postureScore}/100` : "",
          ba.symmetryScore != null ? `Symmetry score: ${ba.symmetryScore}/100` : "",
          ba.aiSummary ? `AI summary: ${ba.aiSummary}` : "",
          ba.aiRecommendations ? `AI recommendations: ${ba.aiRecommendations}` : "",
          ba.therapistNotes ? `Therapist notes: ${ba.therapistNotes}` : "",
          `Assessment date: ${new Date(ba.createdAt).toLocaleDateString("en-GB")}`,
          "",
        );
      }

      if (dx) {
        lines.push(
          "--- AI DIAGNOSIS (most recent) ---",
          dx.summary ? `Summary: ${dx.summary}` : "",
          dx.conditions ? `Conditions: ${JSON.stringify(dx.conditions)}` : "",
          dx.riskFactors ? `Risk factors: ${JSON.stringify(dx.riskFactors)}` : "",
          dx.recommendations ? `Recommendations: ${JSON.stringify(dx.recommendations)}` : "",
          `Date: ${new Date(dx.createdAt).toLocaleDateString("en-GB")}`,
          "",
        );
      }

      if (soaps.length > 0) {
        lines.push("--- RECENT SOAP NOTES ---");
        soaps.forEach((n: any, i: number) => {
          lines.push(
            `[${new Date(n.createdAt).toLocaleDateString("en-GB")}]`,
            n.subjective ? `S: ${n.subjective}` : "",
            n.objective ? `O: ${n.objective}` : "",
            n.assessment ? `A: ${n.assessment}` : "",
            n.plan ? `P: ${n.plan}` : "",
            n.painLevel != null ? `Pain: ${n.painLevel}/10` : "",
            n.rangeOfMotion ? `ROM: ${n.rangeOfMotion}` : "",
            n.functionalTests ? `Tests: ${n.functionalTests}` : "",
            i < soaps.length - 1 ? "---" : "",
          );
        });
        lines.push("");
      }

      if (prevPlans.length > 0) {
        lines.push("--- PREVIOUS REHAB PLANS ---");
        prevPlans.forEach((p: any) => {
          const pj = p.planJson as any;
          lines.push(
            `[${new Date(p.createdAt).toLocaleDateString("en-GB")}] ${p.bodyPart} — ${p.chiefComplaint} (${p.severity}, ${p.phase}, status: ${p.status})`,
            pj?.diagnosisHypothesis ? `  Hypothesis: ${pj.diagnosisHypothesis}` : "",
            pj?.prognosis ? `  Prognosis: ${pj.prognosis}` : "",
          );
        });
        lines.push("");
      }

      if (checkIns.length > 0) {
        lines.push("--- RECENT PATIENT CHECK-INS ---");
        checkIns.forEach((c: any) => {
          lines.push(
            `[${new Date(c.createdAt).toLocaleDateString("en-GB")}] Pain: ${c.painLevel ?? "—"}/10, Mood: ${c.moodLevel ?? "—"}/5, Energy: ${c.energyLevel ?? "—"}/10${c.notes ? ` — ${c.notes}` : ""}`,
          );
        });
        lines.push("");
      }

      patientBrief = lines.filter(Boolean).join("\n");
    }
  } catch (err) {
    console.error("[pre-assess] Error fetching patient data:", err);
    // Non-fatal — Atlas will ask for information manually
  }

  const reply = await preAssess(patientBrief, messages);
  return NextResponse.json({ reply });
}
