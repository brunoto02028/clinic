/**
 * The training gate (activity 074, T-11).
 *
 * Two things are worth a test rather than a QA click: that an old reading does
 * not decide anything, and that a typed-in limit cannot quietly disable the
 * gate. Both are how the blood-pressure threshold of T-3 failed its own QA —
 * 600/400 stored, a real crisis swallowed — and the same shape of mistake here
 * would let someone train at 205/112.
 */
jest.mock("@/lib/db", () => ({ prisma: {} }));

import {
  EXERCISE_BP_DEFAULTS,
  evaluateClearance,
  exerciseBpProblem,
  limitsFromCondition,
  shouldStopNow,
  READING_VALID_MINUTES,
} from "@/lib/automation/exercise-bp";

const limits = { ...EXERCISE_BP_DEFAULTS };
const now = new Date("2026-09-23T12:00:00.000Z");
const minutesAgo = (n: number) => new Date(now.getTime() - n * 60_000);

describe("evaluateClearance", () => {
  it("blocks above the limit, on either number", () => {
    expect(evaluateClearance({ systolic: 205, diastolic: 112, measuredAt: minutesAgo(10) }, limits, now).blocked).toBe(true);
    expect(evaluateClearance({ systolic: 205, diastolic: 90, measuredAt: minutesAgo(10) }, limits, now).blocked).toBe(true);
    expect(evaluateClearance({ systolic: 160, diastolic: 115, measuredAt: minutesAgo(10) }, limits, now).blocked).toBe(true);
  });

  it("clears below the limit", () => {
    const c = evaluateClearance({ systolic: 150, diastolic: 95, measuredAt: minutesAgo(5) }, limits, now);
    expect(c.state).toBe("CLEAR");
    expect(c.blocked).toBe(false);
  });

  it("treats the limit itself as allowed — 'above 200/110' is above", () => {
    expect(evaluateClearance({ systolic: 200, diastolic: 110, measuredAt: minutesAgo(1) }, limits, now).blocked).toBe(false);
  });

  it("says there is no reading once it is older than the window, rather than blocking on it", () => {
    const c = evaluateClearance(
      { systolic: 205, diastolic: 112, measuredAt: minutesAgo(READING_VALID_MINUTES + 1) },
      limits,
      now
    );
    expect(c.state).toBe("NO_RECENT_READING");
    expect(c.blocked).toBe(false);
    expect(c.reading).toBeNull();
  });

  it("does not trust a reading dated in the future", () => {
    expect(
      evaluateClearance({ systolic: 205, diastolic: 112, measuredAt: new Date(now.getTime() + 60_000) }, limits, now).state
    ).toBe("NO_RECENT_READING");
  });

  it("no reading at all is not a block", () => {
    const c = evaluateClearance(null, limits, now);
    expect(c.state).toBe("NO_RECENT_READING");
    expect(c.blocked).toBe(false);
  });

  it("reports how long the reading is still good for", () => {
    expect(evaluateClearance({ systolic: 120, diastolic: 80, measuredAt: minutesAgo(20) }, limits, now).validForMinutes).toBe(40);
  });
});

describe("exerciseBpProblem", () => {
  it("accepts the defaults", () => {
    expect(exerciseBpProblem(limits)).toBeNull();
  });

  it("refuses a limit outside the plausible band", () => {
    expect(exerciseBpProblem({ ...limits, blockSystolic: 600 })?.en).toContain("blocking limit");
    expect(exerciseBpProblem({ ...limits, blockSystolic: 100 })?.en).toContain("blocking limit");
    expect(exerciseBpProblem({ ...limits, stopDiastolic: 500 })?.en).toContain("stop-immediately");
  });

  it("refuses a stop limit at or below the blocking limit", () => {
    expect(exerciseBpProblem({ blockSystolic: 200, blockDiastolic: 110, stopSystolic: 200, stopDiastolic: 115 })?.en).toContain("higher");
    expect(exerciseBpProblem({ blockSystolic: 200, blockDiastolic: 110, stopSystolic: 250, stopDiastolic: 110 })?.en).toContain("higher");
  });

  it("says it in both languages, because the panel that shows it is translated", () => {
    const problem = exerciseBpProblem({ ...limits, blockSystolic: 600 });
    expect(problem?.pt).toContain("limite de bloqueio");
    expect(problem?.pt).not.toEqual(problem?.en);
  });
});

describe("limitsFromCondition", () => {
  it("fills a missing number from the defaults instead of dropping the gate", () => {
    expect(limitsFromCondition({ blockSystolic: 190 })).toEqual({
      ...EXERCISE_BP_DEFAULTS,
      blockSystolic: 190,
    });
  });

  it("ignores a value that is not a usable number", () => {
    expect(limitsFromCondition({ blockSystolic: "nonsense" }).blockSystolic).toBe(EXERCISE_BP_DEFAULTS.blockSystolic);
    expect(limitsFromCondition(null).blockDiastolic).toBe(EXERCISE_BP_DEFAULTS.blockDiastolic);
  });
});

describe("shouldStopNow", () => {
  it("is a different, higher line than the block", () => {
    expect(shouldStopNow(205, 112, limits)).toBe(false);
    expect(shouldStopNow(255, 112, limits)).toBe(true);
    expect(shouldStopNow(205, 120, limits)).toBe(true);
  });
});
