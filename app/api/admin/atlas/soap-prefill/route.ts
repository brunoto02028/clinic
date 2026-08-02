import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
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

  const systemPrompt = `You are Atlas, a clinical rehabilitation specialist AI assistant. Your task is to draft a SOAP note for a physical rehabilitation session based on the patient's available clinical data.

Generate a structured JSON response with four fields:
- subjective: patient's complaints and history (as if written from the patient's reported information)
- objective: clinical findings you would expect/observe based on the data (postural findings, functional limitations, assessment results)
- assessment: clinical reasoning, working diagnosis, and prognosis
- plan: treatment plan including interventions, frequency, HEP, and next steps

Keep each section concise but clinically precise. Use UK physical rehabilitation documentation style. Write in English.
IMPORTANT: Return ONLY a valid JSON object with keys: subjective, objective, assessment, plan. No markdown, no explanation.`;

  const reply = await claudeGenerate(
    [{ role: "user", content: `Draft a SOAP note for this patient:\n\n${context}` }],
    { systemPrompt, maxTokens: 1500 }
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
