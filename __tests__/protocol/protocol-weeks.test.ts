/**
 * @jest-environment node
 *
 * The admin Protocol tab (activity 44) groups items and summarises what the
 * patient sees. Both must agree with the patient's own Treatment Plan and
 * API, or the therapist releases a week believing one thing while the
 * patient sees another.
 */
import {
  groupItems,
  groupKey,
  hiddenAfterMove,
  patientCanSee,
  protocolGated,
  visibleSummary,
  weekLabel,
} from "@/lib/protocol-weeks";

const item = (startWeek: number, endWeek: number | null, hidden = false) => ({ startWeek, endWeek, hiddenFromPatient: hidden });

describe("grouping", () => {
  it("uses the patient page's key and labels", () => {
    expect(groupKey({ startWeek: 1, endWeek: 2 })).toBe("1-2");
    expect(groupKey({ startWeek: 5, endWeek: null })).toBe("5-");
    expect(groupKey({ startWeek: null, endWeek: null })).toBe("1-");
    expect(weekLabel(1, 1)).toBe("Week 1");
    expect(weekLabel(1, 2)).toBe("Weeks 1-2");
    expect(weekLabel(5, null)).toBe("Week 5+");
  });

  it("orders by start week, then shorter range, ongoing last", () => {
    const { keys, groups } = groupItems([item(3, 4), item(1, 2), item(1, null), item(1, 1), item(1, 2)]);
    expect(keys).toEqual(["1-1", "1-2", "1-", "3-4"]);
    expect(groups["1-2"]).toHaveLength(2);
  });
});

describe("patient visibility", () => {
  it("hides flagged items and items past the release limit", () => {
    expect(patientCanSee(item(3, 4), null)).toBe(true);
    expect(patientCanSee(item(3, 4, true), null)).toBe(false);
    expect(patientCanSee(item(3, 4), 2)).toBe(false);
    expect(patientCanSee(item(2, 4), 2)).toBe(true);
  });

  it("is gated until sent and while the latest package is unpaid", () => {
    expect(protocolGated({ status: "APPROVED" })).toBe(true);
    expect(protocolGated({ status: "SENT_TO_PATIENT" })).toBe(false);
    expect(protocolGated({ status: "SENT_TO_PATIENT", packages: [] })).toBe(false);
    expect(protocolGated({ status: "SENT_TO_PATIENT", packages: [{ isPaid: false }] })).toBe(true);
    expect(protocolGated({ status: "SENT_TO_PATIENT", packages: [{ isPaid: true }] })).toBe(false);
  });
});

describe("visibleSummary", () => {
  const sent = (items: ReturnType<typeof item>[], extra: object = {}) => ({ status: "SENT_TO_PATIENT", items, ...extra });

  it("explains why the patient sees nothing", () => {
    expect(visibleSummary({ status: "DRAFT", items: [item(1, 2)] })).toMatch(/not sent/);
    expect(visibleSummary(sent([item(1, 2)], { packages: [{ isPaid: false }] }))).toMatch(/payment pending/);
    expect(visibleSummary(sent([item(1, 2, true)]))).toBe("nothing yet");
  });

  it("merges overlapping and adjacent weeks", () => {
    expect(visibleSummary(sent([item(1, 1), item(1, 2), item(3, 4, true)]))).toBe("Weeks 1–2");
    expect(visibleSummary(sent([item(1, 2), item(3, 4)]))).toBe("Weeks 1–4");
    expect(visibleSummary(sent([item(1, 1)]))).toBe("Week 1");
  });

  it("keeps gaps apart and shows ongoing items", () => {
    expect(visibleSummary(sent([item(1, 2), item(7, 8)]))).toBe("Weeks 1–2, 7–8");
    expect(visibleSummary(sent([item(1, 2), item(5, null)]))).toBe("Weeks 1–2, 5+");
    expect(visibleSummary(sent([item(1, null), item(3, 4)]))).toBe("Weeks 1+");
  });

  it("respects releasedThroughWeek", () => {
    expect(visibleSummary(sent([item(1, 2), item(3, 4)], { releasedThroughWeek: 2 }))).toBe("Weeks 1–2");
  });
});

describe("hiddenAfterMove", () => {
  it("stays visible only when the destination week is fully released", () => {
    expect(hiddenAfterMove([item(1, 2), item(1, 2)])).toBe(false);
    expect(hiddenAfterMove([item(1, 2), item(1, 2, true)])).toBe(true);
    expect(hiddenAfterMove([item(5, 6, true)])).toBe(true);
    expect(hiddenAfterMove([])).toBe(true);
  });
});
