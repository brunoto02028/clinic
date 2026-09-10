import { isPersonalBlockedRoute } from "@/lib/personal-blocked-routes";

describe("isPersonalBlockedRoute (T-19b/T-29 personal gate)", () => {
  describe("clinical + marketing routes are blocked", () => {
    const blocked = [
      // Clinical
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
      // Marketing (clinic/BPR content)
      "/admin/marketing",
      "/admin/marketing/instagram",
      "/admin/articles",
      "/admin/email",
      "/admin/email-templates",
      "/admin/email-marketing",
      "/admin/education",
      "/admin/sales",
    ];
    it.each(blocked)("%s → true", (p) => {
      expect(isPersonalBlockedRoute(p)).toBe(true);
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
      "ai-import", // AI clinical import (creates screening + SOAP)
    ];
    it.each(subs)("/api/admin/patients/<id>/%s → true", (sub) => {
      expect(isPersonalBlockedRoute(`/api/admin/patients/abc123DEF456/${sub}`)).toBe(true);
      expect(isPersonalBlockedRoute(`/api/admin/patients/abc123DEF456/${sub}/extra`)).toBe(true);
      expect(isPersonalBlockedRoute(`/api/admin/patients/abc123DEF456/${sub}?x=1`)).toBe(true);
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
      "/admin/email-test", // not caught by the /admin/email prefix
    ];
    it.each(allowed)("%s → false", (p) => {
      expect(isPersonalBlockedRoute(p)).toBe(false);
    });
  });
});
