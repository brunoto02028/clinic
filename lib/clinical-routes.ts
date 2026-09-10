// Routes that belong to the clinical module only (SOAP notes, protocols, the
// rehab agent, diagnosis and clinical AI). A personal-trainer studio hides
// these in the admin nav (T-19a); this list lets the middleware also block
// them by URL (T-19b), so a personal tenant cannot reach them — or their data
// generators — by typing the address. Pure and Edge-safe — no imports — so the
// middleware can use it.
//
// Deliberately NOT here: exercises, equipment and treatment types. Those are
// shared with the personal product, so they stay reachable for both tenants.
export const CLINICAL_ONLY_ROUTES = [
  "/admin/clinical-notes",
  "/admin/clinical-ai",
  "/admin/clinical", // rehab agent at /admin/clinical/rehab
  "/admin/protocols",
  "/api/admin/clinical-notes",
  "/api/admin/clinical-scribe",
  "/api/admin/protocols",
  "/api/admin/atlas", // clinical AI (soap-prefill, etc.)
  "/api/soap-notes",
];

// The clinical generators nested under a patient: /api/admin/patients/<id>/<sub>.
// A URL-prefix list can't express the dynamic <id>, and these are the endpoints
// that actually produce SOAP notes, protocols, diagnoses and rehab plans — the
// clinical module itself, not just its list screens. Matched by the segment
// after the patient id so the gate holds regardless of the id or trailing path.
const CLINICAL_PATIENT_SUBROUTES = new Set([
  "protocol",
  "protocol-revise",
  "rehab-plan",
  "diagnosis",
  "evidence-report",
  "atlas-treatment-plan",
  "atlas-chat",
]);

export function isClinicalOnlyRoute(pathname: string): boolean {
  if (CLINICAL_ONLY_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
    return true;
  }
  const m = pathname.match(/^\/api\/admin\/patients\/[^/]+\/([^/?]+)/);
  return !!m && CLINICAL_PATIENT_SUBROUTES.has(m[1]);
}
