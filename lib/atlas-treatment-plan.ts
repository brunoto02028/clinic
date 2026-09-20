// Atlas's one-click "Generate Plan" card on the patient's Rehab Agent tab —
// builds a full phased treatment plan from everything already on file
// (screening, notes, documents, protocols). Runs as a background job
// (AtlasTreatmentPlan.status: generating → ready/failed), the same pattern
// as lib/evidence-report.ts's generateEvidenceReport: a 6000-token Claude
// call routinely took long enough to hit the reverse proxy's timeout and
// return an HTML error page instead of JSON, so the API route now creates
// the row and returns immediately; lib/background-jobs.ts processes it.

import { prisma } from "@/lib/db";
import { claudeGenerate } from "@/lib/claude";
import { patientPseudonym, ageBand } from "@/lib/pseudonymize";
import { loadDocumentFindings } from "@/lib/evidence-report";

// Build a complete clinical snapshot of the patient
export async function buildPatientContext(patientId: string, clinicId: string) {
  const [patient, equipment, protocols, documentFindings] = await Promise.all([
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
    // Same extraction/summarisation pipeline as the evidence-report feature
    // (activity 066) — uploaded exams/referrals/imaging reports, cached on
    // the document itself so this never re-runs Docling on every plan.
    loadDocumentFindings(clinicId, patientId),
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
    patient.soapNotesFor.forEach((s: any) => {
      lines.push(`  [${new Date(s.createdAt).toLocaleDateString("en-GB")}] S: ${s.subjective || ""} | O: ${s.objective || ""} | A: ${s.assessment || ""} | P: ${s.plan || ""}`);
    });
  }

  if (patient.rehabPlansAsPatient.length > 0) {
    lines.push(`\nExisting rehab plans: ${patient.rehabPlansAsPatient.map((p: any) => `${p.bodyPart} (${p.phase}/${p.status})`).join(", ")}`);
  }

  if (documentFindings.length > 0) {
    lines.push(`\nFindings from uploaded exams/referrals/imaging reports:`);
    documentFindings.forEach((f: string) => lines.push(`  • ${f}`));
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

export const ATLAS_SYSTEM = `You are Atlas — a senior physical rehabilitation specialist with over 30 years of clinical experience in musculoskeletal, neurological, and sports rehabilitation, completed advanced certifications in manual therapy (IFOMPT), pain neuroscience, and exercise prescription.

Your role here is to help Bruno design a comprehensive, phased treatment plan for a real patient.

Clinical principles:
- Biopsychosocial model. Pain is never purely structural.
- Evidence-based. When you cite research, state the source: "Chou et al. (2017), The Lancet Spine" or "Cochrane review 2021". Never fabricate references. If no specific study exists, say "based on clinical consensus".
- Flag RED FLAGS immediately (cauda equina, cord compression, fracture risk, malignancy).
- Be specific about equipment parameters (e.g. MLS Laser: 4J/cm² 10Hz for acute pain / 8J/cm² 50Hz for tissue repair; TENS: burst mode 80Hz for chronic, acupuncture-like 4Hz for endorphin release).
- Every plan must have a HEP (home exercise programme).

Respond in the same language the patient's own profile is written in (English or Portuguese). If writing in Portuguese, always use Brazilian Portuguese (pt-BR) — this clinic is in Brazil, never European Portuguese (pt-PT) spelling, vocabulary or verb conjugation (e.g. "paciente" not "doente", "acompanhamento" not "seguimento", gerund forms like "estou fazendo" not "estou a fazer").`;

const PLAN_PROMPT_SUFFIX = `Return this exact JSON structure:
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

// claudeGenerate (lib/claude.ts) throws the provider's raw error body
// verbatim (`OpenRouter API error 402: {"error":{...,"user_id":"user_..."}}`)
// — useful for debugging but not something to persist into a column an
// admin/therapist can read straight off the Rehab Agent tab (code review
// finding: it leaked the OpenRouter account's internal user_id). Keeps the
// provider + status code (still useful signal, e.g. "insufficient credits"
// vs "invalid key") and points at the server log for the rest.
function sanitizeError(e: any): { userMessage: string; fullMessage: string } {
  const fullMessage = e?.message || String(e);
  const providerMatch = fullMessage.match(/^(OpenRouter|Claude) API error (\d+):/);
  return {
    userMessage: providerMatch
      ? `${providerMatch[1]} API error ${providerMatch[2]} — check server logs for details.`
      : fullMessage,
    fullMessage,
  };
}

/** Generate the plan identified by planId. Never throws — on failure it
 *  records `error` and moves the row to `failed`, so the client's poll
 *  always gets a terminal state instead of hanging on "generating" forever. */
export async function generateAtlasTreatmentPlan(planId: string): Promise<void> {
  const row = await prisma.atlasTreatmentPlan.findUnique({ where: { id: planId } });
  if (!row) return;

  try {
    const context = await buildPatientContext(row.patientId, row.clinicId);
    if (!context) {
      await prisma.atlasTreatmentPlan.update({
        where: { id: planId },
        data: { status: "failed", error: "Patient not found" },
      });
      return;
    }

    const prompt = `Based on the complete patient profile below, generate a comprehensive, phased treatment plan. Return ONLY valid JSON — no markdown, no explanation outside the JSON.

Patient profile:
${context}

${PLAN_PROMPT_SUFFIX}`;

    const reply = await claudeGenerate(
      [{ role: "user", content: prompt }],
      // disableReasoning: reasoningMaxTokens (OpenRouter's
      // reasoning.max_tokens) turned out not to be a hard cap in practice —
      // a request for 3000 still used 6625, still truncating the JSON at
      // 12000 total (diagnosed via lib/claude.ts's finish_reason/usage
      // logging). This task is already fully constrained by the schema and
      // system prompt below, so no hidden chain-of-thought is needed —
      // disabling it entirely guarantees the whole budget goes to the
      // actual completion.
      { systemPrompt: ATLAS_SYSTEM, maxTokens: 9000, disableReasoning: true }
    );

    // A patient with an extensive history (imaging findings, red flags,
    // long medication/surgical history) can push the response past the
    // token budget, truncating mid-JSON.
    let plan: any;
    try {
      // Try the whole reply first — the common case is a clean JSON object
      // with nothing around it. Only fall back to the greedy brace-match
      // (which can span into unrelated trailing text containing its own
      // braces, e.g. an example the model added) if that fails.
      try {
        plan = JSON.parse(reply.trim());
      } catch {
        const match = reply.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("no JSON object in response");
        plan = JSON.parse(match[0]);
      }
    } catch (parseErr: any) {
      console.error(
        `[atlas-treatment-plan] JSON parse failed for ${planId}: ${parseErr?.message}. reply length: ${reply.length} chars. tail: ${JSON.stringify(reply.slice(-300))}`
      );
      await prisma.atlasTreatmentPlan.update({
        where: { id: planId },
        data: { status: "failed", error: "Atlas didn't return a complete plan — the response may have been cut off. Try again." },
      });
      return;
    }

    await prisma.atlasTreatmentPlan.update({
      where: { id: planId },
      data: { status: "ready", planJson: plan, error: null },
    });
  } catch (e: any) {
    const { userMessage, fullMessage } = sanitizeError(e);
    console.error(`[atlas-treatment-plan] generation failed for ${planId}:`, fullMessage);
    await prisma.atlasTreatmentPlan.update({
      where: { id: planId },
      data: { status: "failed", error: userMessage },
    }).catch(() => {});
  }
}
