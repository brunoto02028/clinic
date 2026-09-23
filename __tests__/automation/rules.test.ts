import { evaluateCondition } from "@/lib/automation/rules";

describe("evaluateCondition", () => {
  describe("operators", () => {
    it("gte", () => {
      expect(evaluateCondition({ missing: { gte: 1 } }, { missing: 1 })).toBe(true);
      expect(evaluateCondition({ missing: { gte: 1 } }, { missing: 0 })).toBe(false);
    });

    it("gt", () => {
      expect(evaluateCondition({ missing: { gt: 1 } }, { missing: 2 })).toBe(true);
      expect(evaluateCondition({ missing: { gt: 1 } }, { missing: 1 })).toBe(false);
    });

    it("lte and lt", () => {
      expect(evaluateCondition({ percent: { lte: 50 } }, { percent: 50 })).toBe(true);
      expect(evaluateCondition({ percent: { lt: 50 } }, { percent: 50 })).toBe(false);
    });

    it("eq and ne", () => {
      expect(evaluateCondition({ locale: { eq: "en-GB" } }, { locale: "en-GB" })).toBe(true);
      expect(evaluateCondition({ locale: { ne: "pt-BR" } }, { locale: "en-GB" })).toBe(true);
      expect(evaluateCondition({ locale: { ne: "en-GB" } }, { locale: "en-GB" })).toBe(false);
    });

    it("in and nin", () => {
      expect(evaluateCondition({ status: { in: ["ACTIVE", "MAINTENANCE"] } }, { status: "ACTIVE" })).toBe(true);
      expect(evaluateCondition({ status: { in: ["ACTIVE"] } }, { status: "CLOSED" })).toBe(false);
      expect(evaluateCondition({ status: { nin: ["CLOSED"] } }, { status: "ACTIVE" })).toBe(true);
      expect(evaluateCondition({ status: { nin: ["CLOSED"] } }, { status: "CLOSED" })).toBe(false);
    });

    it("a bare value means equality", () => {
      expect(evaluateCondition({ locale: "en-GB" }, { locale: "en-GB" })).toBe(true);
      expect(evaluateCondition({ locale: "en-GB" }, { locale: "pt-BR" })).toBe(false);
      expect(evaluateCondition({ enabled: true }, { enabled: true })).toBe(true);
    });

    it("several operators on one key must all hold", () => {
      const between = { score: { gte: 3, lte: 7 } };
      expect(evaluateCondition(between, { score: 5 })).toBe(true);
      expect(evaluateCondition(between, { score: 2 })).toBe(false);
      expect(evaluateCondition(between, { score: 8 })).toBe(false);
    });

    it("several keys are an AND", () => {
      const cond = { missing: { gte: 1 }, locale: "en-GB" };
      expect(evaluateCondition(cond, { missing: 2, locale: "en-GB" })).toBe(true);
      expect(evaluateCondition(cond, { missing: 2, locale: "pt-BR" })).toBe(false);
      expect(evaluateCondition(cond, { missing: 0, locale: "en-GB" })).toBe(false);
    });
  });

  describe("fails closed", () => {
    // These actions message patients and raise clinical alerts. A rule nobody
    // can parse must not fire.
    it("unknown operator", () => {
      expect(evaluateCondition({ missing: { roughly: 1 } }, { missing: 1 })).toBe(false);
    });

    it("missing fact", () => {
      expect(evaluateCondition({ missing: { gte: 1 } }, {})).toBe(false);
      expect(evaluateCondition({ locale: "en-GB" }, {})).toBe(false);
    });

    it("type mismatch — no string-to-number coercion", () => {
      expect(evaluateCondition({ missing: { gte: 1 } }, { missing: "5" as never })).toBe(false);
      expect(evaluateCondition({ missing: { gte: "1" as never } }, { missing: 5 })).toBe(false);
    });

    it("null, array and non-object conditions", () => {
      expect(evaluateCondition(null, { missing: 1 })).toBe(false);
      expect(evaluateCondition([{ missing: 1 }], { missing: 1 })).toBe(false);
      expect(evaluateCondition("missing >= 1", { missing: 1 })).toBe(false);
      expect(evaluateCondition(undefined, { missing: 1 })).toBe(false);
    });

    it("a nested object that is not an operator set", () => {
      expect(evaluateCondition({ missing: { gte: 1, nope: 2 } }, { missing: 5 })).toBe(false);
      expect(evaluateCondition({ patient: { id: "x" } }, { patient: null })).toBe(false);
    });

    it("in/nin with a non-array bound", () => {
      expect(evaluateCondition({ status: { in: "ACTIVE" as never } }, { status: "ACTIVE" })).toBe(false);
      expect(evaluateCondition({ status: { nin: "CLOSED" as never } }, { status: "ACTIVE" })).toBe(false);
    });
  });

  describe("the empty condition", () => {
    it("fires whenever the trigger does", () => {
      expect(evaluateCondition({}, {})).toBe(true);
      expect(evaluateCondition({}, { anything: 1 })).toBe(true);
    });
  });

  describe("the rules this activity seeds", () => {
    it("ADHERENCE_DAILY_REMINDER — anyone with something left today", () => {
      const cond = { missingItems: { gte: 1 } };
      expect(evaluateCondition(cond, { missingItems: 1 })).toBe(true);
      expect(evaluateCondition(cond, { missingItems: 4 })).toBe(true);
      expect(evaluateCondition(cond, { missingItems: 0 })).toBe(false);
    });

    it("ADHERENCE_DAILY_ALERT — only once it is worth a therapist's time", () => {
      const cond = { missingItems: { gte: 3 } };
      expect(evaluateCondition(cond, { missingItems: 3 })).toBe(true);
      expect(evaluateCondition(cond, { missingItems: 2 })).toBe(false);
    });
  });
});
