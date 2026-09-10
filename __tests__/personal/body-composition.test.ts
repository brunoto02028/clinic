import {
  bmi,
  waistToHip,
  masses,
  bodyFatFromSkinfolds,
  epley1RM,
} from "@/lib/body-composition";

describe("bmi", () => {
  it("computes kg/m²", () => {
    expect(bmi(80, 180)).toBe(24.7);
    expect(bmi(60, 165)).toBe(22);
  });
  it("null on missing/invalid", () => {
    expect(bmi(null, 180)).toBeNull();
    expect(bmi(80, 0)).toBeNull();
  });
});

describe("waistToHip", () => {
  it("ratio", () => {
    expect(waistToHip(80, 100)).toBe(0.8);
  });
  it("null on missing", () => {
    expect(waistToHip(80, null)).toBeNull();
  });
});

describe("masses", () => {
  it("splits fat/lean from %BF", () => {
    expect(masses(80, 20)).toEqual({ fatMassKg: 16, leanMassKg: 64 });
  });
  it("null on invalid %BF or weight", () => {
    expect(masses(80, -1)).toEqual({ fatMassKg: null, leanMassKg: null });
    expect(masses(null, 20)).toEqual({ fatMassKg: null, leanMassKg: null });
  });
});

describe("bodyFatFromSkinfolds (Jackson-Pollock → Siri)", () => {
  it("men 3-site produces a plausible %BF", () => {
    // chest 10, abdomen 20, thigh 15 (sum 45), age 30 → ~11–13%
    const bf = bodyFatFromSkinfolds({ chest: 10, abdomen: 20, thigh: 15 }, "M", 30);
    expect(bf).not.toBeNull();
    expect(bf!).toBeGreaterThan(8);
    expect(bf!).toBeLessThan(16);
  });
  it("women 3-site produces a plausible %BF", () => {
    const bf = bodyFatFromSkinfolds({ triceps: 18, suprailiac: 16, thigh: 22 }, "F", 30);
    expect(bf).not.toBeNull();
    expect(bf!).toBeGreaterThan(18);
    expect(bf!).toBeLessThan(30);
  });
  it("uses the 7-site formula when all 7 sites present", () => {
    const bf = bodyFatFromSkinfolds(
      { chest: 8, midaxillary: 8, triceps: 10, subscapular: 12, abdomen: 18, suprailiac: 14, thigh: 16 },
      "M",
      28
    );
    expect(bf).not.toBeNull();
    expect(bf!).toBeGreaterThan(5);
    expect(bf!).toBeLessThan(20);
  });
  it("uses the 3-site formula when only the 3 sites present", () => {
    const bf = bodyFatFromSkinfolds({ chest: 10, abdomen: 20, thigh: 15 }, "M", 30);
    expect(bf).not.toBeNull();
  });
  it("null when sites incomplete for both formulas", () => {
    expect(bodyFatFromSkinfolds({ chest: 10 }, "M", 30)).toBeNull();
  });
  it("null on bad sex/age", () => {
    expect(bodyFatFromSkinfolds({ chest: 10, abdomen: 20, thigh: 15 }, "X" as any, 30)).toBeNull();
    expect(bodyFatFromSkinfolds({ chest: 10, abdomen: 20, thigh: 15 }, "M", 0)).toBeNull();
  });
});

describe("epley1RM", () => {
  it("computes 1RM", () => {
    expect(epley1RM(100, 5)).toBe(116.7);
    expect(epley1RM(60, 1)).toBe(60); // 1 rep = the load itself
  });
  it("null on invalid", () => {
    expect(epley1RM(0, 5)).toBeNull();
    expect(epley1RM(100, null)).toBeNull();
  });
});
