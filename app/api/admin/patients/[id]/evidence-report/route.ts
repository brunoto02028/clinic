import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { staffPatientAccess, recordOfPatient } from "@/lib/staff-patient-access";
import { callAIClinical, parseAIJson } from "@/lib/ai-provider";

export const dynamic = "force-dynamic";

const STAFF = ["SUPERADMIN", "ADMIN", "THERAPIST"];

// GET — latest evidence report for this patient (clinician-internal). With
// `?history=true`, the full chronological history instead (activity 63,
// T-1) — every report ever generated for this patient, most recent first,
// so the clinician can see how the analysis evolved as triage/data came in.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const tenantAccess = await staffPatientAccess(req, params.id);
  if (tenantAccess.response) return tenantAccess.response;

  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user || !STAFF.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (req.nextUrl.searchParams.get("history") === "true") {
    // Capped — a patient regenerating repeatedly shouldn't make this payload
    // (each row carries full evidence/suggestions JSON) grow unbounded. 50 is
    // far beyond any real regeneration count; the UI only ever expands one
    // item at a time anyway.
    const reports = await prisma.clinicalEvidenceReport.findMany({
      where: { patientId: params.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ reports });
  }

  const report = await prisma.clinicalEvidenceReport.findFirst({
    where: { patientId: params.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ report });
}

// PATCH — therapist review actions (status transitions) and/or the
// clinician's own free-text addition to a report (`clinicianNotes`,
// activity 066 T-4 — "completar o relatório junto com o sistema"). No
// SENT_TO_PATIENT here: this report is clinician-internal in this phase.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const tenantAccess = await staffPatientAccess(req, params.id);
  if (tenantAccess.response) return tenantAccess.response;

  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user || !STAFF.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { reportId, status, clinicianNotes } = body as { reportId?: string; status?: string; clinicianNotes?: string };
  if (!reportId) return NextResponse.json({ error: "reportId is required" }, { status: 400 });
  if (status === undefined && clinicianNotes === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const allowed = ["DRAFT", "UNDER_REVIEW", "APPROVED", "ARCHIVED"];
  if (status !== undefined && !allowed.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (clinicianNotes !== undefined && typeof clinicianNotes !== "string") {
    return NextResponse.json({ error: "Invalid clinicianNotes" }, { status: 400 });
  }

  const report = await prisma.clinicalEvidenceReport.findFirst({
    where: { id: reportId, patientId: params.id },
    select: { id: true },
  });
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  const data: any = {};
  if (status !== undefined) {
    data.status = status;
    if (status === "APPROVED") {
      data.approvedAt = new Date();
      data.reviewedById = (session.user as any).id ?? null;
    }
    // error is intentionally left as-is here — it's not cleared on approval.
    // Silently wiping it would erase the only visible record that a report
    // was approved despite a real generation failure. The UI is responsible
    // for not letting that happen (see evidence-report-tab.tsx), not this
    // route papering over it after the fact.
  }
  // Never touches narrativeEn/narrativePt/suggestions/gaps — this is a
  // separate field, always rendered alongside the AI's own content, never
  // merged into or replacing it (plan.md Decisão 7).
  if (clinicianNotes !== undefined) data.clinicianNotes = clinicianNotes;

  if (!(await recordOfPatient("clinicalEvidenceReport", reportId, params.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const updated = await prisma.clinicalEvidenceReport.update({ where: { id: reportId }, data });
  return NextResponse.json({ report: updated });
}

// POST — `action: "translate"` fills narrativePt on demand (T-6); default enqueues
// a fresh GENERATING report from the latest screening (regenerate).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const tenantAccess = await staffPatientAccess(req, params.id);
  if (tenantAccess.response) return tenantAccess.response;

  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user || !STAFF.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  // Translate the AI narrative + suggestions + gaps to PT on demand, in one
  // call (idempotent per field — activity 065 T-2: switching the report to
  // PT used to translate only the summary paragraph, leaving the suggestions
  // table and gaps permanently in English with no way to translate them at
  // all).
  if (body?.action === "translate") {
    const report = await prisma.clinicalEvidenceReport.findFirst({
      where: { id: body.reportId, patientId: params.id },
      select: {
        id: true, narrativeEn: true, narrativePt: true,
        suggestions: true, suggestionsPt: true, gaps: true, gapsPt: true,
      },
    });
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    const sug: any = report.suggestions || {};
    const treatment: any[] = Array.isArray(sug.treatment) ? sug.treatment : [];
    const exercise: any[] = Array.isArray(sug.exercise) ? sug.exercise : [];
    const gapsList: string[] = Array.isArray(report.gaps) ? (report.gaps as any) : [];

    const needNarrative = !!report.narrativeEn && !report.narrativePt;
    const needSuggestions = (treatment.length > 0 || exercise.length > 0) && !report.suggestionsPt;
    const needGaps = gapsList.length > 0 && !report.gapsPt;

    if (!needNarrative && !needSuggestions && !needGaps) {
      return NextResponse.json({ report }); // already fully translated
    }

    const sections: string[] = [];
    if (needNarrative) sections.push(`NARRATIVE:\n${report.narrativeEn}`);
    if (needSuggestions && treatment.length > 0) {
      sections.push(`TREATMENT_TEXT (${treatment.length} items, translate each, same order):\n${treatment.map((s, i) => `${i + 1}. ${s.text}`).join("\n")}`);
    }
    if (needSuggestions && exercise.length > 0) {
      sections.push(`EXERCISE_NAME (${exercise.length} items, translate each, same order):\n${exercise.map((s, i) => `${i + 1}. ${s.name}`).join("\n")}`);
      sections.push(`EXERCISE_PARAMS (${exercise.length} items, translate each, same order):\n${exercise.map((s, i) => `${i + 1}. ${s.params}`).join("\n")}`);
    }
    if (needGaps) sections.push(`GAPS (${gapsList.length} items, translate each, same order):\n${gapsList.map((g, i) => `${i + 1}. ${g}`).join("\n")}`);

    let parsed: any;
    try {
      const raw = await callAIClinical(
        `Translate the following physiotherapy evidence report sections to Brazilian Portuguese. Keep clinical terminology accurate; do not add, remove, or reorder items — every list must come back with exactly the same number of items, in the same order, as given.\n\n${sections.join("\n\n")}\n\nRespond with ONLY a JSON object containing exactly the keys among "narrative" (string), "treatment" (string array), "exerciseName" (string array), "exerciseParams" (string array), "gaps" (string array) that correspond to the sections given above — omit any key whose section wasn't given.`,
        { temperature: 0, maxTokens: 3000, model: "claude" },
      );
      parsed = parseAIJson(raw);
    } catch (e: any) {
      return NextResponse.json({ error: `Translation failed: ${e?.message || e}` }, { status: 502 });
    }

    const data: any = {};
    if (needNarrative) {
      if (typeof parsed.narrative !== "string") return NextResponse.json({ error: "Translation response missing narrative" }, { status: 502 });
      data.narrativePt = parsed.narrative.trim();
    }
    if (needSuggestions) {
      const tText: any[] = Array.isArray(parsed.treatment) ? parsed.treatment : [];
      const eName: any[] = Array.isArray(parsed.exerciseName) ? parsed.exerciseName : [];
      const eParams: any[] = Array.isArray(parsed.exerciseParams) ? parsed.exerciseParams : [];
      if ((treatment.length > 0 && tText.length !== treatment.length) ||
          (exercise.length > 0 && (eName.length !== exercise.length || eParams.length !== exercise.length))) {
        return NextResponse.json({ error: "Translation response had a mismatched item count" }, { status: 502 });
      }
      data.suggestionsPt = {
        treatment: treatment.map((s, i) => ({ ...s, text: tText[i] })),
        exercise: exercise.map((s, i) => ({ ...s, name: eName[i], params: eParams[i] })),
      };
    }
    if (needGaps) {
      const gText: any[] = Array.isArray(parsed.gaps) ? parsed.gaps : [];
      if (gText.length !== gapsList.length) {
        return NextResponse.json({ error: "Translation response had a mismatched item count" }, { status: 502 });
      }
      data.gapsPt = gText;
    }

    const updated = await prisma.clinicalEvidenceReport.update({ where: { id: report.id }, data });
    return NextResponse.json({ report: updated });
  }

  const patient = await prisma.user.findUnique({
    where: { id: params.id },
    select: { clinicId: true },
  });
  if (!patient?.clinicId) {
    return NextResponse.json({ error: "Patient has no clinic" }, { status: 400 });
  }

  // Don't stack duplicate generations: if one is already in flight, return it.
  const inFlight = await prisma.clinicalEvidenceReport.findFirst({
    where: { patientId: params.id, status: "GENERATING" },
  });
  if (inFlight) return NextResponse.json({ report: inFlight }, { status: 200 });

  const screening = await prisma.medicalScreening.findUnique({
    where: { userId: params.id },
    select: { id: true },
  });

  const created = await prisma.clinicalEvidenceReport.create({
    data: {
      clinicId: patient.clinicId,
      patientId: params.id,
      screeningId: screening?.id ?? null,
      status: "GENERATING",
    },
  });

  return NextResponse.json({ report: created }, { status: 201 });
}
