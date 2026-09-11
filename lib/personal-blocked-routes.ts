// Routes a personal-trainer tenant must not reach. Two kinds, both hidden from
// the personal nav and blocked here by URL (middleware, T-19b/T-29):
//  - the clinical module (SOAP notes, protocols, rehab agent, clinical AI, and
//    the per-patient clinical generators);
//  - the clinic's/BPR's marketing (articles, email, education, campaigns).
// Pure and Edge-safe — no imports — so the middleware can use it.
//
// Deliberately NOT here: exercises, equipment and treatment types — shared with
// the personal product, reachable by both tenants.
export const PERSONAL_BLOCKED_ROUTES = [
  // Clinical module
  "/admin/clinical-notes",
  "/admin/clinical-ai",
  "/admin/clinical", // rehab agent at /admin/clinical/rehab
  "/admin/protocols",
  "/api/admin/clinical-notes",
  "/api/admin/clinical-scribe",
  "/api/admin/protocols",
  "/api/admin/atlas", // clinical AI (soap-prefill, etc.)
  "/api/soap-notes",
  // Marketing (clinic/BPR content)
  "/admin/marketing",
  "/admin/articles",
  "/admin/email",
  "/admin/email-templates",
  "/admin/email-marketing",
  "/admin/education",
  "/admin/sales",
];

// Clinical routes on the STUDENT side (patient portal). A personal-trainer
// studio's students get workouts and assessments, not the clinic's clinical
// records/screening — these are hidden from the student nav (patient-sections
// clinicalOnly) and blocked here by URL too. Kept separate from the /admin list
// so the middleware can redirect a blocked student to /dashboard, not /admin.
export const PERSONAL_BLOCKED_PATIENT_ROUTES = [
  "/dashboard/clinical-notes",
  "/dashboard/screening",
  "/dashboard/assessment-flow",
  "/dashboard/treatment",
  "/dashboard/plans",
  "/dashboard/records",
  "/dashboard/documents",
  "/dashboard/outcome-measures",
  "/dashboard/follow-up",
];

// Clinical generators nested under a patient: /api/admin/patients/<id>/<sub>.
// A URL-prefix list can't express the dynamic <id>; these produce SOAP notes,
// protocols, diagnoses, rehab plans and the AI clinical import — the clinical
// module itself. Matched by the segment after the patient id.
const CLINICAL_PATIENT_SUBROUTES = new Set([
  "protocol",
  "protocol-revise",
  "rehab-plan",
  "diagnosis",
  "evidence-report",
  "atlas-treatment-plan",
  "atlas-chat",
  "ai-import", // AI clinical import → creates screening + SOAP notes
]);

export function isPersonalBlockedRoute(pathname: string): boolean {
  const all = [...PERSONAL_BLOCKED_ROUTES, ...PERSONAL_BLOCKED_PATIENT_ROUTES];
  if (all.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
    return true;
  }
  const m = pathname.match(/^\/api\/admin\/patients\/[^/]+\/([^/?]+)/);
  return !!m && CLINICAL_PATIENT_SUBROUTES.has(m[1]);
}

// A blocked student route lives under /dashboard, so a blocked PATIENT should be
// sent back to their own portal rather than to /admin.
export function isPersonalBlockedPatientRoute(pathname: string): boolean {
  return PERSONAL_BLOCKED_PATIENT_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
}
