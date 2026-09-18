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
  "/admin/screening-preview",
  "/api/admin/rehab-plans",
  "/api/admin/screening",
  "/api/medical-screening",
  "/api/foot-scans", // clinical biomechanics (its upload accepted any file type — activity 52, T-9)
  "/api/admin/body-assessments", // clinical AI body scan (not the studio's assessments)
  "/api/admin/appointments/generate-notes",
  "/api/admin/journey/ai-coach",
  "/api/admin/journey/products", // shop products, synced to BPR's Stripe (same as /api/admin/marketplace)
  // BPR's own Stripe account (activity 52, T-7): treatment plans, memberships,
  // packages, the shop and online session payment all charge the platform, so
  // a studio's money would land in BPR's account. A studio charges through its
  // own Connect account (activity 28) and sessions are paid in person.
  "/admin/treatment-plans",
  "/admin/memberships",
  "/admin/marketplace",
  "/api/admin/treatment-plans",
  "/api/admin/memberships",
  "/api/admin/marketplace",
  "/api/patient/treatment-plans",
  "/api/patient/membership/subscribe", // reading one's own (empty) subscription stays open —
  "/api/patient/membership/plans", //     booking/appointment screens ask for it
  "/api/patient/packages",
  "/api/patient/marketplace",
  "/api/payments/create-checkout",
  // Marketing (clinic/BPR content)
  "/admin/marketing",
  "/admin/articles",
  "/api/admin/articles", // blog tooling (AI generate, translate, import) — BPR's blog
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
  "/dashboard/membership", // BPR plans (platform Stripe) — activity 52, T-7
  "/dashboard/marketplace",
  "/api/patient/protocol",
  "/api/patient/rehab-plan",
  "/dashboard/clinical-notes",
  "/dashboard/screening",
  "/dashboard/assessment-flow",
  "/dashboard/treatment",
  "/dashboard/plans",
  "/dashboard/records",
  "/dashboard/documents",
  "/dashboard/outcome-measures",
  "/dashboard/follow-up",
  // Symptom recording for the physio, and BPR's clinical "How It Works"
  // guide — now that a studio student holds every module (activity 55, T-1)
  // only the URL block keeps them out.
  "/dashboard/recordings",
  "/api/patient/consultation-recording",
  "/dashboard/guide",
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
  "report", // clinical report from SOAP/screening
  "packages", // BPR service packages (+ their checkout, on the platform Stripe)
]);

// /api/admin/patients/<id>/documents/generate writes documents from SOAP notes
// and screening; the rest of Documents (upload/list) is shared.
const CLINICAL_PATIENT_DEEP_ROUTE = /^\/api\/admin\/patients\/[^/]+\/documents\/generate(\/|$)/;

export function isPersonalBlockedRoute(pathname: string): boolean {
  const all = [...PERSONAL_BLOCKED_ROUTES, ...PERSONAL_BLOCKED_PATIENT_ROUTES];
  if (all.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
    return true;
  }
  const mApi = pathname.match(/^\/api\/admin\/patients\/[^/]+\/([^/?]+)/);
  if (mApi && CLINICAL_PATIENT_SUBROUTES.has(mApi[1])) return true;
  if (CLINICAL_PATIENT_DEEP_ROUTE.test(pathname)) return true;
  // Same clinical generators as pages: /admin/patients/<id>/<sub> (e.g. diagnosis).
  const mPage = pathname.match(/^\/admin\/patients\/[^/]+\/([^/?]+)/);
  return !!mPage && CLINICAL_PATIENT_SUBROUTES.has(mPage[1]);
}

// A blocked student route lives under /dashboard, so a blocked PATIENT should be
// sent back to their own portal rather than to /admin.
export function isPersonalBlockedPatientRoute(pathname: string): boolean {
  return PERSONAL_BLOCKED_PATIENT_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
}
