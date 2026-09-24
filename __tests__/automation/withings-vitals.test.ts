/**
 * Turning a day's Withings measurements into the one row a day the screens
 * read (activity 074, T-8).
 *
 * Worth a test rather than a QA click because the arithmetic is where a
 * plausible-looking wrong number comes from: a mean of the day's heart rates
 * presented as a *resting* rate, a metric the account does not have showing as
 * zero, or an average that hides how many measurements it came from.
 */
jest.mock("@/lib/withings", () => ({ withingsRawCall: jest.fn() }));

import { vitalsByDay, type WithingsVital } from "@/lib/withings-vitals";

const at = (iso: string, v: Partial<WithingsVital> = {}): WithingsVital => ({
  measuredAt: new Date(iso),
  measureId: iso,
  ...v,
});

describe("vitalsByDay", () => {
  it("averages SpO2 over the day and says how many readings it used", () => {
    const [day] = vitalsByDay([
      at("2026-09-24T08:00:00Z", { spo2: 96 }),
      at("2026-09-24T20:00:00Z", { spo2: 98 }),
    ]);
    expect(day.dataDate).toBe("2026-09-24");
    expect(day.spo2).toBe(97);
    expect(day.samples).toBe(2);
  });

  it("takes the lowest heart rate of the day as resting, not the mean", () => {
    const [day] = vitalsByDay([
      at("2026-09-24T07:00:00Z", { heartRate: 58 }),
      at("2026-09-24T12:00:00Z", { heartRate: 120 }),
      at("2026-09-24T18:00:00Z", { heartRate: 74 }),
    ]);
    // The mean would be 84 — a number that describes nobody's resting rate.
    expect(day.restingHr).toBe(58);
  });

  it("leaves a metric the account does not have undefined, never zero", () => {
    const [day] = vitalsByDay([at("2026-09-24T08:00:00Z", { heartRate: 61 })]);
    expect(day.spo2).toBeUndefined();
    expect(day.bodyTemperature).toBeUndefined();
    expect(day.restingHr).toBe(61);
  });

  it("splits measurements into their own days, in order", () => {
    const days = vitalsByDay([
      at("2026-09-25T08:00:00Z", { spo2: 95 }),
      at("2026-09-23T08:00:00Z", { spo2: 97 }),
      at("2026-09-24T08:00:00Z", { spo2: 96 }),
    ]);
    expect(days.map((d) => d.dataDate)).toEqual(["2026-09-23", "2026-09-24", "2026-09-25"]);
  });

  it("rounds to one decimal, so a screen does not print 96.66666666666667", () => {
    const [day] = vitalsByDay([
      at("2026-09-24T08:00:00Z", { spo2: 96, bodyTemperature: 36.6 }),
      at("2026-09-24T09:00:00Z", { spo2: 97, bodyTemperature: 36.7 }),
      at("2026-09-24T10:00:00Z", { spo2: 97, bodyTemperature: 36.9 }),
    ]);
    expect(day.spo2).toBe(96.7);
    expect(day.bodyTemperature).toBe(36.7);
  });

  it("no measurements at all is no days, not a day of zeroes", () => {
    expect(vitalsByDay([])).toEqual([]);
  });
});
