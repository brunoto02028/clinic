/**
 * @jest-environment node
 *
 * A personal-trainer tenant must not see the clinical-only nav: no SOAP notes,
 * protocols or rehab agent. A clinic sees everything.
 */
import { ADMIN_SECTIONS, visibleAdminSections } from "@/lib/admin-sections";

const tabKeys = (secs: ReturnType<typeof visibleAdminSections>) =>
  secs.flatMap((s) => s.tabs.map((t) => t.key));

describe("visibleAdminSections", () => {
  it("returns everything for a clinic", () => {
    expect(visibleAdminSections(false)).toBe(ADMIN_SECTIONS);
    expect(tabKeys(visibleAdminSections(false))).toEqual(expect.arrayContaining(["notes", "protocols", "rehab-agent"]));
  });

  it("drops the clinical-only tabs for a personal trainer", () => {
    const keys = tabKeys(visibleAdminSections(true));
    expect(keys).not.toContain("notes");
    expect(keys).not.toContain("protocols");
    expect(keys).not.toContain("rehab-agent");
    // The useful ones stay.
    expect(keys).toEqual(expect.arrayContaining(["exercises", "treatments", "equipment", "list", "screening"]));
  });

  it("keeps the Training/Clinical section (it still has workout tabs)", () => {
    expect(visibleAdminSections(true).some((s) => s.key === "clinical")).toBe(true);
  });

  it("hides the Marketing section for a personal tenant (clinic content)", () => {
    expect(visibleAdminSections(true).some((s) => s.key === "marketing")).toBe(false);
    expect(visibleAdminSections(false).some((s) => s.key === "marketing")).toBe(true);
  });
});
