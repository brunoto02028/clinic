import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import { claudeGenerate } from "@/lib/claude";
import { patientPseudonym, ageBand } from "@/lib/pseudonymize";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["ADMIN", "SUPERADMIN", "STAFF", "THERAPIST"];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { patientId } = await req.json();
  if (!patientId) return NextResponse.json({ error: "patientId required" }, { status: 400 });

  const access = await staffPatientAccess(req, patientId);
  if (access.response) return access.response;

  const [patient, answeredQSets] = await Promise.all([
    prisma.user.findUnique({
      where: { id: patientId },
      select: {
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        medicalScreening: {
          select: {
            chiefComplaint: true,
            painScore: true,
            painLocation: true,
            painDuration: true,
            painAggravating: true,
            painRelieving: true,
            currentMedications: true,
            allergies: true,
            surgicalHistory: true,
            otherConditions: true,
            occupation: true,
            unexplainedWeightLoss: true,
            nightPain: true,
            traumaHistory: true,
            neurologicalSymptoms: true,
            bladderBowelDysfunction: true,
          },
        },
        bodyAssessmentsAsPatient: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { aiSummary: true, aiRecommendations: true, overallScore: true },
        },
        soapNotesFor: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { subjective: true, objective: true, assessment: true, plan: true, createdAt: true },
        },
        rehabPlansAsPatient: {
          orderBy: { createdAt: "desc" },
          take: 2,
          select: { chiefComplaint: true, bodyPart: true, severity: true, phase: true, status: true },
        },
      },
    }),
    (prisma as any).patientQuestion.findMany({
      where: { patientId, status: "answered" },
      orderBy: { answeredAt: "desc" },
      take: 3,
    }),
  ]);

  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const band = ageBand(patient.dateOfBirth);
  const ms = patient.medicalScreening;
  const ba = patient.bodyAssessmentsAsPatient[0];

  const redFlags = ms
    ? [
        ms.unexplainedWeightLoss && "Unexplained weight loss",
        ms.nightPain && "Night pain",
        ms.traumaHistory && "Trauma history",
        ms.neurologicalSymptoms && "Neurological symptoms",
        ms.bladderBowelDysfunction && "Bladder/bowel dysfunction",
      ].filter(Boolean)
    : [];

  const contextLines: string[] = [
    `Patient: ${patientPseudonym(patientId)}${band ? ` (age band: ${band})` : ""}`,
    ms?.occupation ? `Occupation: ${ms.occupation}` : "",
    ms?.chiefComplaint ? `Chief complaint: ${ms.chiefComplaint}` : "",
    ms?.painScore != null ? `Pain score (screening): ${ms.painScore}/10` : "",
    ms?.painLocation ? `Pain location: ${ms.painLocation}` : "",
    ms?.painDuration ? `Duration: ${ms.painDuration}` : "",
    ms?.painAggravating ? `Aggravating factors: ${ms.painAggravating}` : "",
    ms?.painRelieving ? `Relieving factors: ${ms.painRelieving}` : "",
    ms?.surgicalHistory ? `Surgical history: ${ms.surgicalHistory}` : "",
    ms?.otherConditions ? `Other conditions: ${ms.otherConditions}` : "",
    ms?.currentMedications ? `Medications: ${ms.currentMedications}` : "",
    ms?.allergies ? `Allergies: ${ms.allergies}` : "",
    redFlags.length > 0 ? `Red flags: ${redFlags.join(", ")}` : "",
    ba?.aiSummary ? `\nPostural/body assessment: ${ba.aiSummary}` : "",
    ba?.aiRecommendations ? `Assessment recommendations: ${ba.aiRecommendations}` : "",
  ].filter(Boolean);

  if (answeredQSets.length > 0) {
    contextLines.push("\nPre-consultation Q&A:");
    for (const qs of answeredQSets) {
      const questions = Array.isArray(qs.questions) ? qs.questions : [];
      const answers = Array.isArray(qs.answers) ? qs.answers : [];
      questions.forEach((q: string, i: number) => {
        const a = answers.find((x: any) => x.index === i);
        contextLines.push(`  Q: ${q}\n  A: ${a?.answer || "(no answer)"}`);
      });
    }
  }

  const prevNotes = (patient as any).soapNotesFor ?? [];
  if (prevNotes.length > 0) {
    contextLines.push("\nPrevious SOAP notes (most recent):");
    prevNotes.forEach((n: any) => {
      contextLines.push(
        `[${new Date(n.createdAt).toLocaleDateString("en-GB")}]\n  S: ${n.subjective?.substring(0, 200)}\n  A: ${n.assessment?.substring(0, 200)}`
      );
    });
  }

  const context = contextLines.join("\n");

  const systemPrompt = `You are Atlas, a clinical rehabilitation documentation assistant. Your task is to draft a STARTING POINT for a SOAP note, from the patient's available clinical data, for a therapist to review, correct and complete before saving.

You were not present in the room. You have no physical exam findings, no observations of your own — only what is listed below. Never invent or extrapolate a finding, measurement, test result or observation that is not explicitly present in the provided data. Fabricating a clinical finding is a patient-safety risk, not a stylistic shortcut.

Generate a structured JSON response with four fields:
- subjective: the patient's own reported complaints and history, drawn only from the data given — do not add symptoms or details not present in it
- objective: leave this to what the data actually contains (e.g. a prior assessment's measured scores, a previous note's documented findings). Where no objective exam data is present, write "No objective findings recorded yet — to be completed by the treating therapist during the session." Do not describe postural or functional findings you were not given.
- assessment: clinical reasoning grounded strictly in the data above; where evidence is insufficient for a working diagnosis, say so explicitly rather than guessing
- plan: a reasonable starting treatment plan (interventions, frequency, HEP, next steps) based on the assessment — framed as a proposal for the therapist to confirm, not a final decision

Keep each section concise but clinically precise. Use UK physical rehabilitation documentation style. Write in English.
IMPORTANT: Return ONLY a valid JSON object with keys: subjective, objective, assessment, plan. No markdown, no explanation.`;

  const reply = await claudeGenerate(
    [{ role: "user", content: `Draft a SOAP note for this patient:\n\n${context}` }],
    { systemPrompt, maxTokens: 1500, temperature: 0.3 }
  );

  let parsed: any = { subjective: "", objective: "", assessment: "", plan: "" };
  try {
    const jsonMatch = reply.match(/\{[\s\S]*\}/);
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
  } catch {
    parsed = { subjective: reply, objective: "", assessment: "", plan: "" };
  }

  return NextResponse.json(parsed);
}
