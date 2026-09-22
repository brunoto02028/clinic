/**
 * @jest-environment node
 *
 * Red flags are tri-state (activity 070, T-12). The twelve columns used to be
 * `Boolean @default(false)`, so a question nobody asked was stored as a denial
 * and every downstream reader — the admin chips, the analysis, the evidence
 * report's red-flag gate — treated an unscreened patient as screened and clear.
 *
 * These tests pin the rule that has to hold everywhere: null is never "no".
 */
import {
  RED_FLAG_KEYS,
  redFlagAnswer,
  unansweredRedFlags,
  isRedFlagScreenComplete,
  toRedFlagKeys,
} from "@/lib/red-flags";
import { analyzeMedicalScreening } from "@/lib/clinical-analysis";
import type { MedicalScreeningForm } from "@/lib/types";

/** A full screening form with every red flag set to `value`. */
function screeningWith(value: boolean | null, overrides: Partial<MedicalScreeningForm> = {}): MedicalScreeningForm {
  const flags = Object.fromEntries(RED_FLAG_KEYS.map((k) => [k, value]));
  return {
    ...flags,
    currentMedications: "",
    allergies: "",
    surgicalHistory: "",
    otherConditions: "",
    gpDetails: "",
    emergencyContact: "",
    emergencyContactPhone: "",
    ...overrides,
  } as unknown as MedicalScreeningForm;
}

describe("redFlagAnswer", () => {
  it("reads true and false as real answers", () => {
    expect(redFlagAnswer(true)).toBe("yes");
    expect(redFlagAnswer(false)).toBe("no");
  });

  it("never reads null or undefined as no", () => {
    expect(redFlagAnswer(null)).toBe("unanswered");
    expect(redFlagAnswer(undefined)).toBe("unanswered");
  });
});

describe("unansweredRedFlags", () => {
  it("lists every flag for a screening nobody filled in", () => {
    expect(unansweredRedFlags(screeningWith(null))).toHaveLength(12);
  });

  it("is empty when all twelve have a yes or no", () => {
    expect(unansweredRedFlags(screeningWith(false))).toEqual([]);
    expect(isRedFlagScreenComplete(screeningWith(false))).toBe(true);
  });

  it("treats a missing screening as entirely unanswered", () => {
    expect(unansweredRedFlags(null)).toHaveLength(12);
  });

  it("only counts the questions the clinic actually asks", () => {
    // A clinic can switch questions off. A disabled question was never put to
    // the patient, so leaving it unanswered is correct — counting it would mark
    // every screening from that clinic incomplete forever.
    const s = screeningWith(null, { nightPain: false } as Partial<MedicalScreeningForm>);
    expect(unansweredRedFlags(s, ["nightPain"])).toEqual([]);
    expect(unansweredRedFlags(s, ["nightPain", "cancerHistory"])).toEqual(["cancerHistory"]);
  });

  it("requires nothing when the red-flag section is disabled", () => {
    expect(unansweredRedFlags(screeningWith(null), [])).toEqual([]);
  });
});

describe("toRedFlagKeys", () => {
  it("drops keys that are not red flags", () => {
    expect(toRedFlagKeys(["nightPain", "notAFlag", "cancerHistory"])).toEqual(["nightPain", "cancerHistory"]);
  });
});

describe("analyzeMedicalScreening — red-flag status", () => {
  it("calls an unanswered screening incomplete, not clear", () => {
    // The central regression: this used to come out as "none_detected".
    const a = analyzeMedicalScreening(screeningWith(null));
    expect(a.redFlagAssessment.status).toBe("incomplete");
    expect(a.redFlagAssessment.unanswered).toHaveLength(12);
  });

  it("only reports none_detected when every question was answered no", () => {
    const a = analyzeMedicalScreening(screeningWith(false));
    expect(a.redFlagAssessment.status).toBe("none_detected");
    expect(a.redFlagAssessment.unanswered).toEqual([]);
  });

  it("lets an urgent yes win over unanswered questions", () => {
    // A "yes" to a dangerous flag is actionable whatever the rest says.
    const s = screeningWith(null, { bladderBowelDysfunction: true } as Partial<MedicalScreeningForm>);
    expect(analyzeMedicalScreening(s).redFlagAssessment.status).toBe("urgent_red_flags");
  });

  it("ranks incomplete above possible, since a gap may hide an urgent flag", () => {
    const s = screeningWith(null, { dizzinessBalanceIssues: true } as Partial<MedicalScreeningForm>);
    expect(analyzeMedicalScreening(s).redFlagAssessment.status).toBe("incomplete");
  });

  it("uses possible_red_flags once the screen is complete", () => {
    const s = screeningWith(false, { dizzinessBalanceIssues: true } as Partial<MedicalScreeningForm>);
    expect(analyzeMedicalScreening(s).redFlagAssessment.status).toBe("possible_red_flags");
  });

  it("respects the clinic's enabled set when judging completeness", () => {
    const s = screeningWith(null, { nightPain: false } as Partial<MedicalScreeningForm>);
    const a = analyzeMedicalScreening(s, { enabledRedFlags: ["nightPain"] });
    expect(a.redFlagAssessment.status).toBe("none_detected");
  });
});
