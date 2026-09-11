/**
 * @jest-environment node
 *
 * A personal-trainer tenant must not see the clinical-only nav: no SOAP notes,
 * protocols or rehab agent. A clinic sees everything.
 */
import { visibleAdminSections } from "@/lib/admin-sections";

const tabKeys = (secs: ReturnType<typeof visibleAdminSections>) =>
  secs.flatMap((s) => s.tabs.map((t) => t.key));
const sectionKeys = (secs: ReturnType<typeof visibleAdminSections>) => secs.map((s) => s.key);

describe("visibleAdminSections", () => {
  it("keeps the clinical nav for a clinic", () => {
    expect(tabKeys(visibleAdminSections(false))).toEqual(expect.arrayContaining(["notes", "protocols", "rehab-agent"]));
  });

  it("hides personalOnly sections (Challenges, Nutrition) from a clinic, shows them to a personal trainer (G7)", () => {
    for (const key of ["challenges", "nutrition"]) {
      expect(sectionKeys(visibleAdminSections(false))).not.toContain(key);
      expect(sectionKeys(visibleAdminSections(true))).toContain(key);
    }
  });

  it("drops the clinical-only tabs for a personal trainer", () => {
    const keys = tabKeys(visibleAdminSections(true));
    expect(keys).not.toContain("notes");
    expect(keys).not.toContain("protocols");
    expect(keys).not.toContain("rehab-agent");
    // The useful ones stay. (equipment/screening became clinicalOnly in act.26.)
    expect(keys).toEqual(expect.arrayContaining(["exercises", "treatments", "list", "challenges-list"]));
    expect(keys).not.toContain("equipment");
    expect(keys).not.toContain("screening");
  });

  it("keeps the Training/Clinical section (it still has workout tabs)", () => {
    expect(visibleAdminSections(true).some((s) => s.key === "clinical")).toBe(true);
  });

  it("hides the Marketing section for a personal tenant (clinic content)", () => {
    expect(visibleAdminSections(true).some((s) => s.key === "marketing")).toBe(false);
    expect(visibleAdminSections(false).some((s) => s.key === "marketing")).toBe(true);
  });
});
