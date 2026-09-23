import { runKey } from "@/lib/automation/run";

// The key is the whole of the idempotency guarantee, so it is worth testing on
// its own — no database, no clock.
describe("runKey", () => {
  const base = { clinicId: "c1", ruleCode: "RULE", patientId: "p1", window: "2026-09-23" };

  it("is stable for the same input", () => {
    expect(runKey(base)).toBe(runKey({ ...base }));
  });

  it("separates clinics, rules, patients and windows", () => {
    const k = runKey(base);
    expect(runKey({ ...base, clinicId: "c2" })).not.toBe(k);
    expect(runKey({ ...base, ruleCode: "OTHER" })).not.toBe(k);
    expect(runKey({ ...base, patientId: "p2" })).not.toBe(k);
    expect(runKey({ ...base, window: "2026-09-24" })).not.toBe(k);
  });

  it("a clinic-wide rule cannot collide with a patient's", () => {
    // The patient part is `p:<id>` or `all`, never the bare id: a patient
    // whose id were the sentinel itself would otherwise share the key.
    const sweep = runKey({ ...base, patientId: null });
    expect(sweep).toContain(":all:");
    expect(runKey({ ...base, patientId: "all" })).not.toBe(sweep);
    expect(runKey({ ...base, patientId: "-" })).not.toBe(sweep);
  });

  describe("the facts", () => {
    it("the same situation is the same key", () => {
      const a = runKey({ ...base, facts: { missingItems: 3 } });
      const b = runKey({ ...base, facts: { missingItems: 3 } });
      expect(a).toBe(b);
    });

    it("a situation that got worse is a different key", () => {
      // This is what lets an alert escalate inside its own window instead of
      // being read as a repeat.
      const mild = runKey({ ...base, facts: { missingItems: 3 } });
      const worse = runKey({ ...base, facts: { missingItems: 7 } });
      expect(worse).not.toBe(mild);
    });

    it("key order in the caller does not change the key", () => {
      const a = runKey({ ...base, facts: { missingItems: 3, adherence: 40 } });
      const b = runKey({ ...base, facts: { adherence: 40, missingItems: 3 } });
      expect(a).toBe(b);
    });

    it("no facts is the bare key", () => {
      expect(runKey({ ...base, facts: {} })).toBe(runKey(base));
    });

    it("distinguishes a missing fact from a zero", () => {
      expect(runKey({ ...base, facts: { missingItems: 0 } })).not.toBe(runKey(base));
    });
  });
});
