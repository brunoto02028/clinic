// Evidence-report generation pipeline (activity 15, T-3).
//
// Turns a submitted triage (MedicalScreening) into a structured, source-traceable
// evidence report for the physiotherapist to review. Clinician-internal.
//
// Safety: runs the existing red-flag analysis FIRST. Urgent red flags halt the
// pipeline — no literature search, no treatment suggestions, just an alert.
// GDPR: the patient is pseudonymised before the prompt; only the clinical
// condition goes to Europe PMC; text is generated via callAIClinical (Claude when
// AI_STRICT_MODE is on).

import { prisma } from "@/lib/db";
import { callAIClinical, parseAIJson } from "@/lib/ai-provider";
import { analyzeMedicalScreening } from "@/lib/clinical-analysis";
import { patientPseudonym, ageBand } from "@/lib/pseudonymize";
import { searchLiterature, buildQueries, dedupeById, type LiteratureResult } from "@/lib/europe-pmc";

const SYSTEM_PROMPT = `You are a clinical evidence librarian for a UK physiotherapy clinic.
You do NOT diagnose, prescribe, or decide care — you organise published evidence to speed up
the physiotherapist's own decision. Every suggestion you make must cite one of the numbered
sources given to you (F1, F2, …); never invent studies or citations. Separate what the
clinic can do now (from its catalogue) from what the literature mentions but the clinic does
not currently offer. Output is reviewed by a human before any patient contact. Respond with
ONLY valid JSON, no prose outside it.`;

function pick(sel: LiteratureResult[]) {
  const sr = sel.filter((r) => r.evidenceRank === 5).slice(0, 3);
  const rct = sel.filter((r) => r.evidenceRank === 4).slice(0, 3);
  const rest = sel.filter((r) => r.evidenceRank <= 3);
  const chosen = [...sr, ...rct];
  if (chosen.length < 4) chosen.push(...rest.slice(0, 4 - chosen.length));
  return chosen.map((r, i) => ({ ref: `F${i + 1}`, ...r }));
}

async function loadClinicCatalog(clinicId: string) {
  const exercises = await prisma.exercise.findMany({
    where: { isActive: true, clinicId },
    select: { name: true, bodyRegion: true, tags: true },
    take: 200,
  });
  const protocols = await prisma.protocolTemplate.findMany({
    where: { isActive: true, clinicId },
    select: { name: true, condition: true, equipment: true },
    take: 100,
  });
  const equipment = [...new Set(protocols.flatMap((p) => p.equipment || []))].sort();
  return { exercises, protocols, equipment };
}

/** Generate (or regenerate) the report identified by reportId. Never throws — on
 *  failure it records `error` and moves the row to DRAFT so it is visible/retryable. */
export async function generateEvidenceReport(reportId: string): Promise<void> {
  const report = await prisma.clinicalEvidenceReport.findUnique({
    where: { id: reportId },
    include: {
      patient: { select: { id: true, dateOfBirth: true } },
      screening: true,
    },
  });
  if (!report) return;

  try {
    const s: any = report.screening;
    if (!s) {
      await prisma.clinicalEvidenceReport.update({
        where: { id: reportId },
        data: { status: "DRAFT", error: "No screening linked to this report." },
      });
      return;
    }

    // 1. Safety analysis (reuses the existing engine)
    const analysis = analyzeMedicalScreening(s);
    const flags = analysis.redFlagAssessment;

    // 2. Case snapshot (triage + latest outcome measures)
    const latestOm = await prisma.patientOutcomeMeasure.findFirst({
      where: { patientId: report.patientId },
      orderBy: { recordedAt: "desc" },
    });
    const caseSummary = {
      chiefComplaint: s.chiefComplaint || null,
      location: s.painLocation || null,
      duration: s.painDuration || null,
      scores: {
        vas: latestOm?.vasScore ?? s.painScore ?? s.painLevel ?? null,
        faamAdl: latestOm?.faamAdlPercent ?? null,
        faamSport: latestOm?.faamSportPercent ?? null,
        function: latestOm?.overallFunction ?? null,
      },
      ageBand: ageBand(report.patient?.dateOfBirth ?? null),
      urgency: analysis.urgencyLevel,
      clinicalPattern: analysis.triageClassification.likelyDomain,
    };

    // 3. Urgent red-flag gate — halt before any search/suggestion
    if (flags.status === "urgent_red_flags") {
      await prisma.clinicalEvidenceReport.update({
        where: { id: reportId },
        data: {
          status: "DRAFT",
          redFlag: true,
          redFlagDetails: flags.flags as any,
          caseSummary: caseSummary as any,
          narrativeEn:
            "Urgent red flags detected on triage. Evidence gathering was halted; this case requires priority human assessment before any treatment suggestion.",
          evidence: [],
          clinicCrossRef: undefined,
          suggestions: undefined,
        },
      });
      return;
    }

    // 4. Literature search (condition only — no PII)
    const condition = (s.chiefComplaint || s.painLocation || "musculoskeletal pain").toString().slice(0, 120);
    const queries = buildQueries({ condition, region: s.painLocation });
    const lists: LiteratureResult[][] = [];
    for (const q of queries) {
      try {
        lists.push(await searchLiterature(q, 12));
      } catch (e) {
        // one failed query shouldn't sink the report; keep going
      }
    }
    const selected = pick(dedupeById(lists));

    // 5. Clinic catalogue (scoped to this clinic)
    const catalog = await loadClinicCatalog(report.clinicId);

    // 6. AI synthesis — pseudonymised, traceable, catalogue-aware
    const evidenceList = selected
      .map((r) => `${r.ref}: [${r.evidenceLevel}] "${r.title}" — ${r.journal || "?"} (${r.year}). ${r.url || ""}`)
      .join("\n");
    const exerciseList = catalog.exercises.map((e) => `${e.name} (${e.bodyRegion})`).join("; ") || "(none catalogued)";
    const equipmentList = catalog.equipment.join(", ") || "(none catalogued)";

    const prompt = `Patient ${patientPseudonym(report.patientId)} (age band ${caseSummary.ageBand || "n/a"}).
Case: ${JSON.stringify(caseSummary)}
Precautionary flags (not urgent): ${JSON.stringify(flags.flags)}

Numbered evidence sources:
${evidenceList || "(no strong evidence returned)"}

Clinic catalogue — exercises: ${exerciseList}
Clinic catalogue — equipment: ${equipmentList}

Produce a JSON object with exactly these keys:
{
  "clinicCrossRef": { "available": [string], "offCatalog": [{ "item": string, "sourceRef": string }] },
  "suggestions": {
    "treatment": [{ "text": string, "sourceRef": string, "available": "yes"|"no"|"partial" }],
    "exercise":  [{ "name": string, "params": string, "sourceRef": string, "inCatalog": boolean }]
  },
  "gaps": [string],
  "narrative": string
}
Rules: every suggestion.sourceRef must be exactly one of the source labels above (F1, F2, …, no brackets). "available"/
"inCatalog" reflect the clinic catalogue. "narrative" is 3-5 sentences in British English
summarising the evidence for the physiotherapist. Do not diagnose or prescribe.`;

    const raw = await callAIClinical(prompt, {
      systemPrompt: SYSTEM_PROMPT,
      temperature: 0.2,
      maxTokens: 4000,
      model: "claude",
    });

    let parsed: any = {};
    try {
      parsed = parseAIJson(raw);
    } catch {
      parsed = {};
    }

    await prisma.clinicalEvidenceReport.update({
      where: { id: reportId },
      data: {
        status: "DRAFT",
        redFlag: false,
        redFlagDetails: flags.status === "possible_red_flags" ? (flags.flags as any) : undefined,
        caseSummary: caseSummary as any,
        evidence: selected as any,
        clinicCrossRef: parsed.clinicCrossRef ?? undefined,
        suggestions: parsed.suggestions ?? undefined,
        gaps: parsed.gaps ?? undefined,
        narrativeEn: parsed.narrative ?? null,
        aiModel: "claude",
        error: null,
      },
    });
  } catch (e: any) {
    // Never leave the row stuck in GENERATING.
    await prisma.clinicalEvidenceReport.update({
      where: { id: reportId },
      data: { status: "DRAFT", error: `Generation failed: ${e?.message || e}` },
    }).catch(() => {});
  }
}
