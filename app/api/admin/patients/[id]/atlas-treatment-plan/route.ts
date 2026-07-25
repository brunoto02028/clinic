import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { claudeGenerate } from "@/lib/claude";
import { resolveClinicId } from "@/lib/resolve-clinic-id";
import { patientPseudonym, ageBand } from "@/lib/pseudonymize";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["ADMIN", "SUPERADMIN", "STAFF"];

// Build a complete clinical snapshot of the patient
async function buildPatientContext(patientId: string, clinicId: string) {
  const [patient, equipment, protocols] = await Promise.all([
    prisma.user.findUnique({
      where: { id: patientId },
      select: {
        firstName: true, lastName: true, dateOfBirth: true,
        medicalScreening: {
          select: {
            chiefComplaint: true, painScore: true, painLocation: true,
            painAggravating: true, painRelieving: true, occupation: true,
            surgicalHistory: true, otherConditions: true, currentMedications: true,
            allergies: true, treatmentGoals: true, functionalLimitations: true,
            activityLevel: true, previousPhysioDetails: true,
          },
        },
        bodyAssessmentsAsPatient: {
          orderBy: { createdAt: "desc" }, take: 1,
          select: { aiSummary: true, aiRecommendations: true, overallScore: true },
        },
        diagnosesAsPatient: {
          orderBy: { createdAt: "desc" }, take: 1,
          select: { summary: true, conditions: true, findings: true, recommendations: true, status: true, createdAt: true },
        },
        soapNotesFor: {
          orderBy: { createdAt: "desc" }, take: 3,
          select: { subjective: true, objective: true, assessment: true, plan: true, createdAt: true },
        },
        rehabPlansAsPatient: {
          orderBy: { createdAt: "desc" }, take: 2,
          select: { chiefComplaint: true, bodyPart: true, severity: true, phase: true, status: true, createdAt: true },
        },
        protocolsAsPatient: {
          orderBy: { createdAt: "desc" }, take: 2,
          select: { title: true, summary: true, status: true, createdAt: true },
        },
      },
    }),
    (prisma as any).clinicEquipment.findMany({
      where: { clinicId, isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { name: true, manufacturer: true, model: true, protocols: true, indications: true },
    }),
    (prisma as any).protocolTemplate.findMany({
      where: { clinicId, isActive: true },
      orderBy: { name: "asc" }, take: 20,
      select: { name: true, condition: true, bodyRegion: true, equipment: true, estimatedWeeks: true, sessionsPerWeek: true },
    }),
  ]);

  if (!patient) return null;

  const band = ageBand(patient.dateOfBirth);
  const ms = patient.medicalScreening;
  const ba = patient.bodyAssessmentsAsPatient[0];
  const dx = patient.diagnosesAsPatient[0];

  const lines: string[] = [
    `Patient: ${patientPseudonym(patientId)}${band ? ` (age band: ${band})` : ""}`,
    ms?.occupation ? `Occupation: ${ms.occupation}` : "",
    ms?.chiefComplaint ? `Chief complaint: ${ms.chiefComplaint}` : "",
    ms?.painScore != null ? `Pain VAS: ${ms.painScore}/10` : "",
    ms?.painLocation ? `Pain location: ${ms.painLocation}` : "",
    ms?.painAggravating ? `Aggravating: ${ms.painAggravating}` : "",
    ms?.painRelieving ? `Relieving: ${ms.painRelieving}` : "",
    ms?.surgicalHistory ? `Surgical history: ${ms.surgicalHistory}` : "",
    ms?.otherConditions ? `Comorbidities: ${ms.otherConditions}` : "",
    ms?.currentMedications ? `Medications: ${ms.currentMedications}` : "",
    ms?.treatmentGoals ? `Patient goals: ${ms.treatmentGoals}` : "",
    ms?.functionalLimitations ? `Functional limitations: ${ms.functionalLimitations}` : "",
    ms?.allergies ? `Allergies: ${ms.allergies}` : "",
    ba?.aiSummary ? `Postural assessment: ${ba.aiSummary}` : "",
    ba?.aiRecommendations ? `Assessment recommendations: ${ba.aiRecommendations}` : "",
    dx?.summary ? `AI Diagnosis: ${dx.summary}` : "",
    dx?.findings ? `Clinical findings: ${JSON.stringify(dx.findings)}` : "",
    dx?.recommendations ? `Previous recommendations: ${JSON.stringify(dx.recommendations)}` : "",
  ];

  if (patient.soapNotesFor.length > 0) {
    lines.push(`\nRecent SOAP notes:`);
    patient.soapNotesFor.forEach((s: any, i: number) => {
      lines.push(`  [${new Date(s.createdAt).toLocaleDateString("en-GB")}] S: ${s.subjective || ""} | O: ${s.objective || ""} | A: ${s.assessment || ""} | P: ${s.plan || ""}`);
    });
  }

  if (patient.rehabPlansAsPatient.length > 0) {
    lines.push(`\nExisting rehab plans: ${patient.rehabPlansAsPatient.map((p: any) => `${p.bodyPart} (${p.phase}/${p.status})`).join(", ")}`);
  }

  if (equipment.length > 0) {
    lines.push(`\nClinic equipment available:`);
    equipment.forEach((eq: any) => {
      const prots = eq.protocols ? (() => { try { return JSON.parse(eq.protocols); } catch { return []; } })() : [];
      const inds = eq.indications ? (() => { try { return JSON.parse(eq.indications); } catch { return []; } })() : [];
      lines.push(`  • ${eq.name}${eq.manufacturer ? ` (${eq.manufacturer}${eq.model ? " " + eq.model : ""})` : ""}`);
      if (inds.length) lines.push(`    Indications: ${inds.join(", ")}`);
      if (prots.length) lines.push(`    Protocols: ${prots.map((p: any) => p.condition).join(", ")}`);
    });
  }

  if (protocols.length > 0) {
    lines.push(`\nClinic protocol templates:`);
    protocols.forEach((p: any) => {
      lines.push(`  • ${p.name}${p.condition ? ` [${p.condition}]` : ""} — ${p.equipment?.join(", ") || "general"}${p.estimatedWeeks ? ` — ~${p.estimatedWeeks} wks` : ""}`);
    });
  }

  return lines.filter(Boolean).join("\n");
}

const ATLAS_SYSTEM = `You are Atlas — a senior physical rehabilitation specialist with over 30 years of clinical experience in musculoskeletal, neurological, and sports rehabilitation. You trained in Portugal, completed advanced certifications in manual therapy (IFOMPT), pain neuroscience, and exercise prescription.

Your role here is to help Bruno design a comprehensive, phased treatment plan for a real patient.

Clinical principles:
- Biopsychosocial model. Pain is never purely structural.
- Evidence-based. When you cite research, state the source: "Chou et al. (2017), The Lancet Spine" or "Cochrane review 2021". Never fabricate references. If no specific study exists, say "based on clinical consensus".
- Flag RED FLAGS immediately (cauda equina, cord compression, fracture risk, malignancy).
- Be specific about equipment parameters (e.g. MLS Laser: 4J/cm² 10Hz for acute pain / 8J/cm² 50Hz for tissue repair; TENS: burst mode 80Hz for chronic, acupuncture-like 4Hz for endorphin release).
- Every plan must have a HEP (home exercise programme).`;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clinicId = (await resolveClinicId(session)) || "";
  const { action, message, history = [], planData } = await req.json();

  // ── action: "generate" → produce a full structured plan ──
  if (action === "generate" || !action) {
    const context = await buildPatientContext(params.id, clinicId);
    if (!context) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    const prompt = `Based on the complete patient profile below, generate a comprehensive, phased treatment plan. Return ONLY valid JSON — no markdown, no explanation outside the JSON.

Patient profile:
${context}

Return this exact JSON structure:
{
  "workingDiagnosis": "string",
  "clinicalRationale": "string (cite evidence where relevant)",
  "redFlags": ["string"] or [],
  "goals": {
    "shortTerm": ["string (2-4 weeks)"],
    "longTerm": ["string (discharge criteria)"]
  },
  "totalWeeks": number,
  "sessionsPerWeek": number,
  "phases": [
    {
      "name": "Phase name",
      "weeks": "e.g. Weeks 1-2",
      "objective": "string",
      "inClinic": [
        {
          "intervention": "string",
          "equipment": "string or null",
          "parameters": "string or null",
          "rationale": "string"
        }
      ],
      "hep": [
        {
          "exercise": "string",
          "sets": "string",
          "frequency": "string",
          "notes": "string or null"
        }
      ],
      "progressionCriteria": "string"
    }
  ],
  "contraindications": "string or null",
  "patientEducation": ["string"],
  "reviewMilestone": "string (when to reassess)"
}`;

    const reply = await claudeGenerate(
      [{ role: "user", content: prompt }],
      { systemPrompt: ATLAS_SYSTEM, maxTokens: 4000 }
    );

    let plan: any = {};
    try {
      const match = reply.match(/\{[\s\S]*\}/);
      if (match) plan = JSON.parse(match[0]);
    } catch { plan = { notes: reply }; }

    return NextResponse.json({ plan });
  }

  // ── action: "chat" → conversational refinement ──
  if (action === "chat") {
    if (!message?.trim()) return NextResponse.json({ error: "message required" }, { status: 400 });

    const context = await buildPatientContext(params.id, clinicId);
    const planContext = planData
      ? `\n\nCurrent draft plan being discussed:\n${JSON.stringify(planData, null, 2)}`
      : "";

    const systemWithContext = `${ATLAS_SYSTEM}\n\nPatient context:\n${context || "No data yet."}${planContext}`;

    const messages = [
      ...history.map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: message },
    ];

    const reply = await claudeGenerate(messages, { systemPrompt: systemWithContext, maxTokens: 3000 });
    return NextResponse.json({ reply });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
