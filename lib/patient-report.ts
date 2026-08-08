// lib/patient-report.ts
// Complete patient clinical report — data gathering + print-ready HTML rendering.
// Used by /api/admin/patients/[id]/report (view/download as PDF via browser print, or email to patient).

import { prisma } from "@/lib/db";

export async function getPatientReportData(patientId: string) {
  const [patient, screening, bodyAssessment, diagnosis, protocols, soapNotes, atlasChat] = await Promise.all([
    prisma.user.findUnique({
      where: { id: patientId },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, dateOfBirth: true, createdAt: true } as any,
    }).catch(() => null),
    (prisma as any).medicalScreening.findUnique({ where: { userId: patientId } }).catch(() => null),
    (prisma as any).bodyAssessment.findFirst({
      where: { patientId }, orderBy: { createdAt: "desc" },
    }).catch(() => null),
    (prisma as any).aIDiagnosis.findFirst({
      where: { patientId }, orderBy: { createdAt: "desc" },
    }).catch(() => null),
    (prisma as any).treatmentProtocol.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      include: {
        therapist: { select: { firstName: true, lastName: true } },
        items: { orderBy: [{ phase: "asc" }, { sortOrder: "asc" }] },
      },
    }).catch(() => [] as any[]),
    (prisma as any).sOAPNote.findMany({
      where: { patientId }, orderBy: { createdAt: "desc" }, take: 10,
      include: { therapist: { select: { firstName: true, lastName: true } } },
    }).catch(() => [] as any[]),
    (prisma as any).atlasChatMessage.count({ where: { patientId } }).catch(() => 0),
  ]);

  return { patient, screening, bodyAssessment, diagnosis, protocols, soapNotes, atlasChatCount: atlasChat };
}

const esc = (s: any) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const fmtDate = (d: any) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—");

const row = (label: string, value: any) =>
  value ? `<tr><td class="lbl">${esc(label)}</td><td>${esc(value)}</td></tr>` : "";

const PHASE_LABELS: Record<string, string> = {
  SHORT_TERM: "Short-Term (Acute) — Weeks 1-4",
  MEDIUM_TERM: "Medium-Term (Rehab) — Weeks 4-12",
  LONG_TERM: "Long-Term (Maintenance) — Weeks 12+",
};
const ITEM_TYPES: Record<string, string> = {
  IN_CLINIC: "In-Clinic",
  HOME_EXERCISE: "Home Exercise",
  HOME_CARE: "Home Care",
  ASSESSMENT: "Assessment",
};

function parseJson(v: any): any[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try { const p = typeof v === "string" ? JSON.parse(v) : v; return Array.isArray(p) ? p : []; } catch { return []; }
}

export function renderPatientReportHTML(data: Awaited<ReturnType<typeof getPatientReportData>>, opts?: { forEmail?: boolean }): string {
  const { patient, screening: ms, bodyAssessment: ba, diagnosis: dx, protocols, soapNotes } = data as any;
  if (!patient) return "<html><body>Patient not found</body></html>";

  const age = patient.dateOfBirth ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear() : null;

  // ── Red flags ──
  const redFlags: string[] = [];
  if (ms) {
    const flags: [string, string][] = [
      ["unexplainedWeightLoss", "Unexplained weight loss"], ["nightPain", "Night pain"],
      ["traumaHistory", "Trauma history"], ["neurologicalSymptoms", "Neurological symptoms"],
      ["bladderBowelDysfunction", "Bladder/bowel dysfunction"], ["recentInfection", "Recent infection"],
      ["cancerHistory", "Cancer history"], ["steroidUse", "Steroid use"],
      ["osteoporosisRisk", "Osteoporosis risk"], ["cardiovascularSymptoms", "Cardiovascular symptoms"],
      ["severeHeadache", "Severe headache"], ["dizzinessBalanceIssues", "Dizziness / balance issues"],
    ];
    flags.forEach(([key, label]) => {
      if (ms[key]) redFlags.push(`${label}${ms[`${key}Details`] ? ` — ${ms[`${key}Details`]}` : ""}`);
    });
  }

  // ── Protocols ──
  const protocolsHtml = (protocols || []).map((p: any) => {
    const goals = parseJson(p.goals);
    const precautions = parseJson(p.precautions);
    const phases: Record<string, any[]> = {};
    (p.items || []).forEach((it: any) => { (phases[it.phase] = phases[it.phase] || []).push(it); });

    return `
    <div class="section">
      <h2>Treatment Protocol: ${esc(p.title)}</h2>
      <p class="meta">Status: ${esc(p.status)} · Created ${fmtDate(p.createdAt)} by ${esc(p.therapist?.firstName || "")} ${esc(p.therapist?.lastName || "")}${p.estimatedWeeks ? ` · ${p.estimatedWeeks} weeks` : ""}${(p as any).totalSessions ? ` · ${(p as any).totalSessions} sessions` : ""}</p>
      <p>${esc(p.summary)}</p>
      ${p.therapistComments ? `<p class="comment"><strong>Therapist comments:</strong> ${esc(p.therapistComments)}</p>` : ""}

      ${goals.length ? `<h3>Treatment Goals</h3><ul>${goals.map((g: any) => `<li><strong>${esc(g.timeline || g.phase || "")}</strong>: ${esc(g.goal || g.description || "")}${g.metrics ? ` <em>(${esc(g.metrics)})</em>` : ""}</li>`).join("")}</ul>` : ""}

      ${precautions.length ? `<div class="precautions"><h3>⚠ Precautions</h3><ul>${precautions.map((pr: any) => `<li>${esc(pr.precaution || pr.description || pr)}</li>`).join("")}</ul></div>` : ""}

      ${Object.entries(phases).map(([phase, items]) => `
        <h3>${esc(PHASE_LABELS[phase] || phase)}</h3>
        <table class="items">
          <thead><tr><th>Type</th><th>Item</th><th>Details</th><th>Dosage</th><th>Weeks</th></tr></thead>
          <tbody>
          ${(items as any[]).map((it) => `
            <tr>
              <td>${esc(ITEM_TYPES[it.itemType] || it.itemType)}</td>
              <td><strong>${esc(it.title)}</strong>${it.hiddenFromPatient ? " <em>(internal)</em>" : ""}</td>
              <td>${esc(it.description || "")}${it.instructions ? `<br/><em>${esc(it.instructions)}</em>` : ""}</td>
              <td>${[it.frequency, it.sets ? `${it.sets} sets` : "", it.reps ? `${it.reps} reps` : "", it.holdSeconds ? `hold ${it.holdSeconds}s` : "", it.restSeconds ? `rest ${it.restSeconds}s` : "", it.sessionDuration ? `${it.sessionDuration}min` : ""].filter(Boolean).map(esc).join(" · ") || "—"}</td>
              <td>${it.startWeek || 1}${it.endWeek ? `–${it.endWeek}` : "+"}</td>
            </tr>`).join("")}
          </tbody>
        </table>`).join("")}
    </div>`;
  }).join("");

  // ── SOAP notes ──
  const soapHtml = (soapNotes || []).length ? `
    <div class="section">
      <h2>Session Notes (SOAP)</h2>
      ${soapNotes.map((s: any) => `
        <div class="soap">
          <p class="meta">${fmtDate(s.createdAt)} — ${esc(s.therapist?.firstName || "")} ${esc(s.therapist?.lastName || "")}${s.painLevel != null ? ` · Pain ${s.painLevel}/10` : ""}</p>
          <table>
            ${row("Subjective", s.subjective)}
            ${row("Objective", s.objective)}
            ${row("Assessment", s.assessment)}
            ${row("Plan", s.plan)}
          </table>
        </div>`).join("")}
    </div>` : "";

  const printBar = opts?.forEmail ? "" : `
    <div class="no-print toolbar">
      <button onclick="window.print()">🖨 Print / Save as PDF</button>
      <span>Use your browser's print dialog and choose "Save as PDF" to download.</span>
    </div>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Clinical Report — ${esc(patient.firstName)} ${esc(patient.lastName)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1a202c; margin: 0; padding: 24px; max-width: 900px; margin-inline: auto; font-size: 13px; line-height: 1.5; }
  h1 { font-size: 22px; margin: 0 0 2px; color: #0f766e; }
  h2 { font-size: 16px; color: #0f766e; border-bottom: 2px solid #0f766e; padding-bottom: 4px; margin: 28px 0 10px; }
  h3 { font-size: 13.5px; margin: 16px 0 6px; color: #334155; }
  .meta { color: #64748b; font-size: 11.5px; margin: 2px 0 8px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0f766e; padding-bottom: 12px; }
  .brand { text-align: right; color: #0f766e; font-weight: 700; }
  .brand small { display: block; color: #64748b; font-weight: 400; }
  table { border-collapse: collapse; width: 100%; margin: 6px 0; }
  td, th { padding: 5px 8px; vertical-align: top; text-align: left; border: 1px solid #e2e8f0; }
  td.lbl { width: 180px; font-weight: 600; background: #f8fafc; }
  table.items th { background: #f0fdfa; font-size: 11px; text-transform: uppercase; letter-spacing: .03em; color: #334155; }
  .precautions { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 4px 14px 8px; margin: 10px 0; }
  .precautions h3 { color: #b91c1c; }
  .comment { background: #f0fdfa; border-left: 3px solid #0f766e; padding: 6px 10px; }
  .soap { margin-bottom: 14px; }
  .redflags li { color: #b91c1c; }
  .toolbar { background: #0f766e; color: #fff; padding: 10px 16px; border-radius: 8px; margin-bottom: 20px; display: flex; align-items: center; gap: 12px; }
  .toolbar button { background: #fff; color: #0f766e; border: 0; border-radius: 6px; padding: 8px 14px; font-weight: 700; cursor: pointer; font-size: 13px; }
  .toolbar span { font-size: 11.5px; opacity: .9; }
  .footer { margin-top: 32px; padding-top: 10px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 10.5px; }
  ul { margin: 4px 0; padding-left: 20px; }
  @media print { .no-print { display: none !important; } body { padding: 0; font-size: 11.5px; } .section { page-break-inside: avoid; } }
</style>
</head>
<body>
${printBar}
<div class="header">
  <div>
    <h1>Clinical Report</h1>
    <p class="meta">Generated ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</p>
  </div>
  <div class="brand">Bruno Physical Rehabilitation<small>Ipswich, Suffolk · bpr.rehab</small></div>
</div>

<div class="section">
  <h2>Patient Information</h2>
  <table>
    ${row("Name", `${patient.firstName} ${patient.lastName}`)}
    ${row("Age", age ? `${age} years (DOB ${fmtDate(patient.dateOfBirth)})` : null)}
    ${row("Email", patient.email)}
    ${row("Phone", patient.phone)}
    ${row("Patient since", fmtDate(patient.createdAt))}
  </table>
</div>

${ms ? `
<div class="section">
  <h2>Medical Screening — Patient Reported</h2>
  <table>
    ${row("Chief complaint", ms.chiefComplaint)}
    ${row("Pain location", ms.painLocation)}
    ${row("Pain score", ms.painScore != null ? `${ms.painScore}/10` : null)}
    ${row("Pain duration", ms.painDuration)}
    ${row("Pain type", ms.painType)}
    ${row("Aggravating factors", ms.painAggravating)}
    ${row("Relieving factors", ms.painRelieving)}
    ${row("Functional limitations", ms.functionalLimitations)}
    ${row("Occupation", ms.occupation)}
    ${row("Activity level", ms.activityLevel)}
    ${row("Hobbies / sports", ms.hobbiesSports)}
    ${row("Surgical history", ms.surgicalHistory)}
    ${row("Other conditions", ms.otherConditions)}
    ${row("Current medications", ms.currentMedications)}
    ${row("Allergies", ms.allergies)}
    ${row("Previous rehabilitation", ms.previousPhysioDetails)}
    ${row("Treatment goals", ms.treatmentGoals)}
    ${row("Height / Weight", [ms.height, ms.weight].filter(Boolean).join(" / ") || null)}
    ${row("Smoker", ms.smoker ? "Yes" : null)}
    ${row("GP details", ms.gpDetails)}
  </table>
  ${redFlags.length ? `<h3 style="color:#b91c1c">Red Flags Reported</h3><ul class="redflags">${redFlags.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}
</div>` : ""}

${ba ? `
<div class="section">
  <h2>Biomechanical / Postural Assessment</h2>
  <p class="meta">${fmtDate(ba.createdAt)}${ba.overallScore != null ? ` · Overall score: ${ba.overallScore}` : ""}</p>
  ${ba.aiSummary ? `<p>${esc(ba.aiSummary)}</p>` : ""}
  ${ba.aiRecommendations ? `<p><strong>Recommendations:</strong> ${esc(ba.aiRecommendations)}</p>` : ""}
</div>` : ""}

${dx ? `
<div class="section">
  <h2>Clinical Diagnosis (AI-assisted, clinician reviewed)</h2>
  <p class="meta">${fmtDate(dx.createdAt)} · Status: ${esc(dx.status)}</p>
  <p>${esc(dx.summary)}</p>
  ${parseJson(dx.conditions).length ? `<h3>Conditions</h3><ul>${parseJson(dx.conditions).map((c: any) => `<li><strong>${esc(c.name)}</strong>${c.severity ? ` (${esc(c.severity)})` : ""}: ${esc(c.description || "")}</li>`).join("")}</ul>` : ""}
  ${parseJson(dx.findings).length ? `<h3>Key Findings</h3><ul>${parseJson(dx.findings).map((f: any) => `<li><strong>${esc(f.area || "")}</strong>: ${esc(f.finding || f.description || "")}</li>`).join("")}</ul>` : ""}
  ${dx.therapistComments ? `<p class="comment"><strong>Clinician comments:</strong> ${esc(dx.therapistComments)}</p>` : ""}
</div>` : ""}

${protocolsHtml}

${soapHtml}

<div class="footer">
  This report was generated by Bruno Physical Rehabilitation (bpr.rehab). It reflects the clinical information recorded up to the generation date and is intended for the patient and their healthcare providers. For questions, contact the clinic.
</div>
</body>
</html>`;
}
