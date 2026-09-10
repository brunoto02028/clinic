import { isClinicalOnlyRoute } from "@/lib/clinical-routes";

describe("isClinicalOnlyRoute (T-19b clinical gate)", () => {
  describe("clinical-only routes are blocked", () => {
    const blocked = [
      "/admin/clinical-notes",
      "/admin/clinical-notes/123",
      "/admin/clinical-ai",
      "/admin/clinical", // rehab agent parent
      "/admin/clinical/rehab",
      "/admin/protocols",
      "/api/admin/clinical-notes",
      "/api/admin/clinical-scribe/generate-soap",
      "/api/admin/protocols",
      "/api/admin/atlas/soap-prefill",
      "/api/soap-notes",
    ];
    it.each(blocked)("%s → true", (p) => {
      expect(isClinicalOnlyRoute(p)).toBe(true);
    });
  });

  describe("per-patient clinical generators are blocked (dynamic id)", () => {
    const subs = [
      "protocol",
      "protocol-revise",
      "rehab-plan",
      "diagnosis",
      "evidence-report",
      "atlas-treatment-plan",
      "atlas-chat",
    ];
    it.each(subs)("/api/admin/patients/<id>/%s → true", (sub) => {
      expect(isClinicalOnlyRoute(`/api/admin/patients/abc123DEF456/${sub}`)).toBe(true);
      // trailing path and query still match
      expect(isClinicalOnlyRoute(`/api/admin/patients/abc123DEF456/${sub}/extra`)).toBe(true);
      expect(isClinicalOnlyRoute(`/api/admin/patients/abc123DEF456/${sub}?x=1`)).toBe(true);
    });
  });

  describe("shared routes stay reachable for a personal tenant", () => {
    const allowed = [
      "/admin/exercises",
      "/admin/equipment",
      "/admin/treatment-plans",
      "/admin/patients",
      "/admin/appointments",
      "/api/admin/exercises",
      "/api/admin/patients", // list
      "/api/admin/patients/abc123/packages",
      "/api/admin/patients/abc123/documents",
      "/api/admin/patients/abc123/messages",
      "/api/admin/patients/abc123", // the patient record itself
    ];
    it.each(allowed)("%s → false", (p) => {
      expect(isClinicalOnlyRoute(p)).toBe(false);
    });
  });
});
