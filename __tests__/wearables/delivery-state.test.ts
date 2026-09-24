/**
 * @jest-environment node
 *
 * "Connected" answered the wrong question. It meant the OAuth worked, and a
 * device could be authorised and never send anything — with nothing anywhere
 * saying so (activity 075, T-10). These four states are what the screens read,
 * so the difference between "we know it is silent" and "nobody has asked" has
 * to survive every change to this file.
 */

jest.mock("@/lib/db", () => ({ prisma: {} }));

import { deliveryState } from "@/lib/withings-subscriptions";
import { WITHINGS_APPLI } from "@/lib/withings";

const ALL = [
  WITHINGS_APPLI.WEIGHT,
  WITHINGS_APPLI.BLOOD_PRESSURE,
  WITHINGS_APPLI.ACTIVITY,
  WITHINGS_APPLI.SLEEP,
];

describe("deliveryState", () => {
  it("has never been asked when there is no check date", () => {
    expect(deliveryState({ notifyConfirmedAppli: [], notifyCheckedAt: null })).toBe("unchecked");
    // A connection made before this existed has no columns filled at all.
    expect(deliveryState({})).toBe("unchecked");
  });

  it("is silent when the check ran and Withings confirmed nothing", () => {
    expect(deliveryState({ notifyConfirmedAppli: [], notifyCheckedAt: new Date() })).toBe("silent");
  });

  it("is receiving only when every kind we asked for came back", () => {
    expect(deliveryState({ notifyConfirmedAppli: ALL, notifyCheckedAt: new Date() })).toBe("receiving");
  });

  it("does not care about the order Withings lists them in", () => {
    expect(
      deliveryState({ notifyConfirmedAppli: [...ALL].reverse(), notifyCheckedAt: new Date() })
    ).toBe("receiving");
  });

  it("is partial when blood pressure is there but something else is not", () => {
    expect(
      deliveryState({
        notifyConfirmedAppli: [WITHINGS_APPLI.BLOOD_PRESSURE],
        notifyCheckedAt: new Date(),
      })
    ).toBe("partial");
  });

  it("is partial — not receiving — when blood pressure is the one missing", () => {
    // The case that matters most in a clinic built around blood pressure:
    // steps arriving is not the same as the cuff arriving, and a green light
    // here would be the exact lie this work exists to remove.
    expect(
      deliveryState({
        notifyConfirmedAppli: ALL.filter((a) => a !== WITHINGS_APPLI.BLOOD_PRESSURE),
        notifyCheckedAt: new Date(),
      })
    ).toBe("partial");
  });

  it("an old check is still a check — staleness is a different question", () => {
    const longAgo = new Date("2020-01-01T00:00:00.000Z");
    expect(deliveryState({ notifyConfirmedAppli: ALL, notifyCheckedAt: longAgo })).toBe("receiving");
  });
});
