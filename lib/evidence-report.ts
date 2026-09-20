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
import { extractText } from "@/lib/docling";

// Document types worth feeding into the evidence report (activity 066 T-1) —
// insurance paperwork and consent forms are never clinically relevant, no
// matter how "OTHER" some outlier document might be classified.
const CLINICALLY_RELEVANT_DOCUMENT_TYPES = [
  "MEDICAL_REFERRAL", "MEDICAL_REPORT", "PRESCRIPTION", "IMAGING", "PREVIOUS_TREATMENT",
] as const;

const SYSTEM_PROMPT = `You are a clinical evidence librarian for a UK physiotherapy clinic.
You do NOT diagnose, prescribe, or decide care — you organise published evidence to speed up
the physiotherapist's own decision. Every suggestion you make must cite one of the numbered
sources given to you (F1, F2, …); never invent studies or citations. Separate what the
clinic can do now (from its catalogue) from what the literature mentions but the clinic does
not currently offer. Output is reviewed by a human before any patient contact. Respond with
ONLY valid JSON, no prose outside it.`;

/**
 * Relinks a patient's stuck evidence report to a screening that was just
 * created/edited, when the report is stuck for exactly the known reason: it
 * was generated before any screening existed for this patient. Called from
 * both the patient-facing screening submit route and the admin edit-screening
 * route — kept here as the single place this narrow, safety-sensitive
 * criterion lives, instead of duplicated inline in each caller.
 *
 * Deliberately conservative: only ever touches a report that is
 * `status === "DRAFT"` with no `screeningId` at all. GENERATING (a
 * generation may be mid-flight), UNDER_REVIEW and APPROVED (a clinician has
 * already reviewed it) are never touched, regardless of `error` — `error` is
 * not a reliable "broken" signal by itself, it isn't cleared on approval.
 */
export async function relinkBrokenEvidenceReport(patientId: string, screeningId: string): Promise<void> {
  const existingReport = await prisma.clinicalEvidenceReport.findFirst({
    where: { patientId, status: { in: ["GENERATING", "DRAFT", "UNDER_REVIEW", "APPROVED"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, screeningId: true },
  });
  if (existingReport && existingReport.status === "DRAFT" && !existingReport.screeningId) {
    await prisma.clinicalEvidenceReport.update({
      where: { id: existingReport.id },
      data: { screeningId, status: "GENERATING", error: null, attempts: 0 },
    });
  }
}

/**
 * Called whenever a clinically-relevant PatientDocument is stored (any
 * upload path — patient portal, admin upload, AI Import), so the evidence
 * report stays current as the patient trickles in exams over days instead
 * of everything at once at triage time (activity 066 T-1, Decisão 0).
 *
 * No report yet → create one (same as the triage-submit enqueue). Latest
 * report already reviewed (`APPROVED`/`SENT_TO_PATIENT`/`ARCHIVED`) → a new
 * document never mutates something the clinician already signed off on; it
 * opens the next version instead. Anything still in flight
 * (`GENERATING`/`DRAFT`/`UNDER_REVIEW`) → just flag it — the background job
 * (T-2) reprocesses it, and several documents landing in a burst collapse
 * into a single reprocessing pass instead of one regeneration each.
 *
 * Never throws — a document upload must never fail because this side effect
 * did.
 */
export async function notifyNewClinicalDocument(patientId: string, documentType: string): Promise<void> {
  if (!(CLINICALLY_RELEVANT_DOCUMENT_TYPES as readonly string[]).includes(documentType)) return;

  try {
    const patient = await prisma.user.findUnique({ where: { id: patientId }, select: { clinicId: true } });
    if (!patient?.clinicId) return;

    const latest = await prisma.clinicalEvidenceReport.findFirst({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, screeningId: true },
    });

    if (!latest || ["APPROVED", "SENT_TO_PATIENT", "ARCHIVED"].includes(latest.status)) {
      const screeningId = latest?.screeningId ?? (
        await prisma.medicalScreening.findFirst({
          where: { userId: patientId, isSubmitted: true, consentGiven: true },
          select: { id: true },
        })
      )?.id ?? null;
      await prisma.clinicalEvidenceReport.create({
        data: { clinicId: patient.clinicId, patientId, screeningId, status: "GENERATING" },
      });
      return;
    }

    await prisma.clinicalEvidenceReport.update({
      where: { id: latest.id },
      data: { needsReprocessing: true },
    });
  } catch (e) {
    console.error("[evidence-report] notifyNewClinicalDocument failed (non-blocking):", e);
  }
}

/**
 * Turns a patient's clinically-relevant documents into short findings the
 * report can cite and search literature for — extraction/summarisation is
 * cached on the document itself (`extractedText`/`aiSummary`), so
 * regenerating a report repeatedly never re-runs Docling or the summary
 * call for a document already processed. A single document's failure
 * (Docling down, corrupted file) is swallowed and just excludes that one
 * document — never sinks the whole report (same resilience pattern as the
 * literature search below).
 */
export async function loadDocumentFindings(clinicId: string, patientId: string): Promise<string[]> {
  const documents = await prisma.patientDocument.findMany({
    where: { clinicId, patientId, documentType: { in: CLINICALLY_RELEVANT_DOCUMENT_TYPES as any } },
    select: { id: true, fileData: true, fileType: true, fileName: true, extractedText: true, aiSummary: true, description: true },
  });

  const findings: string[] = [];
  for (const doc of documents) {
    try {
      let summary = doc.aiSummary;
      // `summary == null` (never computed), not `!summary` — the AI legitimately
      // returning "" (its prompt explicitly allows "omit anything that is not
      // a clinical finding") is itself a cached result. Treating "" as a cache
      // miss re-ran the summarisation call on every single future generation
      // for that document, forever (code review finding, activity 066 T-1).
      if (summary == null) {
        let text = doc.extractedText || doc.description || null;
        if (!text && doc.fileData) {
          const buffer = Buffer.from(doc.fileData, "base64");
          const blob = new Blob([buffer], { type: doc.fileType || "application/octet-stream" });
          const extracted = await extractText(blob, doc.fileName);
          text = extracted?.text || null;
          if (text) {
            await prisma.patientDocument.update({ where: { id: doc.id }, data: { extractedText: text } });
          }
        }
        if (text) {
          // Always in English (activity 066 follow-up — live demo with real
          // PT-BR patients found the literature search coming up empty
          // because everything feeding it, including this, was in
          // Portuguese) — this summary is stored and reused both as
          // case-summary context and as a literature-search input, so it
          // needs to be search-safe regardless of the source document's
          // own language.
          summary = (await callAIClinical(
            `Summarise the key clinical finding(s) from this document in 1-2 concise sentences, for a physiotherapy evidence report. Focus on diagnoses, pathology, and anything relevant to musculoskeletal rehabilitation. Omit anything that is not a clinical finding. Respond in English regardless of the source document's language.\n\n${text.slice(0, 8000)}`,
            { temperature: 0, maxTokens: 300, model: "claude" },
          )).trim();
          await prisma.patientDocument.update({ where: { id: doc.id }, data: { aiSummary: summary } });
        }
      }
      if (summary) findings.push(summary);
    } catch (e) {
      console.error(`[evidence-report] Failed to process document ${doc.id} for findings (non-blocking):`, e);
    }
  }
  return findings;
}

/**
 * Auto-heal for the enqueue-on-submit fire-and-forget in
 * app/api/medical-screening/route.ts, which can fail silently (activity 066
 * T-2 — 3 real patients were found with a submitted triage and no report at
 * all, with no record of why). Finds submitted, consented screenings whose
 * patient has never had a `ClinicalEvidenceReport` and creates one. Capped
 * per call so a large backlog (a bug, a bulk import) can't spend a whole
 * job cycle's AI budget reconciling instead of processing the normal queue.
 *
 * The orphan filter runs in the DB (`evidenceReportsAsPatient: { none: {} }`),
 * not by loading a fixed page of screenings and filtering in memory — the
 * earlier version capped at the first 500 submitted screenings system-wide
 * before filtering, so past that count an orphan could go permanently
 * unseen, and one high-volume clinic could crowd out others in the same
 * fixed window (code review finding, activity 066 T-2). Never throws — a
 * transient DB error here must not abort the rest of the job cycle's real
 * processing (same discipline as `notifyNewClinicalDocument`).
 */
export async function reconcileMissingEvidenceReports(): Promise<void> {
  try {
    const orphaned = await prisma.medicalScreening.findMany({
      where: { isSubmitted: true, consentGiven: true, user: { evidenceReportsAsPatient: { none: {} } } },
      select: { id: true, userId: true },
      take: 10,
    });
    if (orphaned.length === 0) return;

    // One batched lookup instead of one findUnique per orphan in the loop
    // below (code review finding, activity 066 T-2).
    const patients = await prisma.user.findMany({
      where: { id: { in: orphaned.map((s) => s.userId) } },
      select: { id: true, clinicId: true },
    });
    const clinicIdByPatient = new Map(patients.map((p) => [p.id, p.clinicId]));

    for (const s of orphaned) {
      const clinicId = clinicIdByPatient.get(s.userId);
      if (!clinicId) continue;
      await prisma.clinicalEvidenceReport
        .create({ data: { clinicId, patientId: s.userId, screeningId: s.id, status: "GENERATING" } })
        // Two ticks racing on the same orphaned screening is a rare, harmless
        // duplicate at worst (same accepted class of race as the enqueue this
        // is healing) — never let one failure stop the rest of the batch.
        .catch((e) => console.error(`[evidence-report] Reconcile create failed for ${s.userId}:`, e));
    }
  } catch (e) {
    console.error("[evidence-report] reconcileMissingEvidenceReports failed (non-blocking):", e);
  }
}

/**
 * Europe PMC is indexed overwhelmingly in English, but BPR's triage is
 * always filled in Portuguese — a live demo with real PT-BR patients
 * (activity 066 follow-up) found `buildQueries` searching literally on
 * "Dor no ombro direito" and getting back unrelated English-language
 * articles (nursing, stroke rehab, cardiology — anything that happened to
 * share a stray word), because nothing in the query was ever translated.
 * Cheap, best-effort: falls back to the original text (a same-language
 * search is still strictly better than no search) rather than failing the
 * whole report generation over a translation hiccup.
 */
async function translateForSearch(text: string): Promise<string> {
  try {
    const translated = await callAIClinical(
      `Translate this clinical phrase to English, using standard medical/physiotherapy terminology suitable as a PubMed/Europe PMC search term. Respond with ONLY the translated phrase — no quotes, no punctuation, no explanation.\n\n${text}`,
      { temperature: 0, maxTokens: 60, model: "claude" },
    );
    const cleaned = translated.trim().replace(/^["'.]+|["'.]+$/g, "");
    return cleaned || text;
  } catch {
    return text;
  }
}

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
 *  failure it records `error` and moves the row to DRAFT so it is visible/retryable.
 *
 *  Deliberately never writes `needsReprocessing` — only the claim step in
 *  `generatePendingEvidenceReports` (background-jobs.ts) clears it, atomically
 *  with the status flip to GENERATING, right before calling this. If this
 *  function cleared it too (e.g. unconditionally to `false` on success), a
 *  document arriving mid-run — after `loadDocumentFindings` already ran, so
 *  not actually reflected in this run's output — would have its
 *  `needsReprocessing: true` (correctly set by `notifyNewClinicalDocument`
 *  while status was still GENERATING) silently wiped by this function's own
 *  final write, losing the signal that another pass is still needed. */
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
    let s: any = report.screening;
    if (!s) {
      // The report can end up with no screeningId if it was generated (or
      // regenerated) at a moment the patient's triage didn't exist yet —
      // self-heal by relinking to whatever MedicalScreening exists for this
      // patient now, instead of leaving the report permanently broken.
      // Only a submitted, consented screening qualifies — an in-progress
      // autosave draft is not something this should turn into a clinical
      // document behind the patient's back.
      const current = await prisma.medicalScreening.findFirst({
        where: { userId: report.patientId, isSubmitted: true, consentGiven: true },
      });
      if (current) {
        await prisma.clinicalEvidenceReport.update({
          where: { id: reportId },
          data: { screeningId: current.id },
        });
        s = current;
      } else {
        await prisma.clinicalEvidenceReport.update({
          where: { id: reportId },
          data: { status: "DRAFT", error: "No screening linked to this report." },
        });
        return;
      }
    }

    // 1. Safety analysis (reuses the existing engine)
    const analysis = analyzeMedicalScreening(s);
    const flags = analysis.redFlagAssessment;

    // 2. Case snapshot (triage + latest outcome measures + document findings)
    const latestOm = await prisma.patientOutcomeMeasure.findFirst({
      where: { patientId: report.patientId },
      orderBy: { recordedAt: "desc" },
    });
    const documentFindings = await loadDocumentFindings(report.clinicId, report.patientId);
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
      documentFindings,
    };

    // 3. Urgent red-flag gate — halt before any search/suggestion
    if (flags.status === "urgent_red_flags") {
      await prisma.clinicalEvidenceReport.update({
        where: { id: reportId },
        data: {
          status: "DRAFT",
          error: null,
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

    // 4. Literature search (condition + document findings — no PII).
    // Translated to English first — see translateForSearch's comment;
    // documentFindings are English by construction: both places that write
    // `PatientDocument.aiSummary` (loadDocumentFindings above, and the AI
    // Import route's extraction prompt) explicitly instruct the model to
    // respond in English. This is prompt compliance, not a deterministic
    // guardrail (unlike condition/region, which are always run through
    // translateForSearch) — a model ignoring either instruction reopens the
    // Portuguese-query bug for that one document. documentFindings isn't
    // passed through translateForSearch itself because its summaries can run
    // longer than a search phrase and would risk truncation under that
    // function's short maxTokens budget. Also note: any aiSummary cached
    // before this English requirement existed stays in its original
    // language — this only guarantees English going forward.
    const conditionRaw = (s.chiefComplaint || s.painLocation || "musculoskeletal pain").toString().slice(0, 120);
    const condition = await translateForSearch(conditionRaw);
    const region = s.painLocation ? await translateForSearch(s.painLocation.toString().slice(0, 60)) : null;
    const queries = buildQueries({ condition, region, documentFindings });
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

    // A parse failure here previously left `parsed = {}` with no error
    // recorded — the report ended up DRAFT with `error: null`, indistinguishable
    // from a real (if empty) success. A clinician reviewing the list would see
    // "generated" with nothing to say why there's no narrative/suggestions.
    let parsed: any = {};
    let parseError: string | null = null;
    try {
      parsed = parseAIJson(raw);
    } catch (e: any) {
      parseError = `AI response was not valid JSON: ${e?.message || e}`;
    }
    // Valid-but-empty JSON (e.g. `{}`, or a truncated response that happens
    // to close its braces before filling any field) doesn't throw, so the
    // check above alone still misses it — the report would look identical to
    // a real success with nothing to review (code review finding, activity
    // 065). evidence-report-tab.tsx only disables "mark review"/"approve"
    // when `error` is truthy, so a clinician could approve a blank report.
    if (!parseError && !parsed.narrative && !parsed.suggestions && !parsed.clinicCrossRef) {
      parseError = "AI response was valid JSON but had no usable content (empty narrative/suggestions).";
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
        error: parseError,
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
