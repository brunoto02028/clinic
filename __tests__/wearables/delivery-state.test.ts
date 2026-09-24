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

import { deliveryState, missingKinds, bloodPressureMissing } from "@/lib/withings-subscriptions";
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

  it("blood pressure missing is its own answer, not just 'partial'", () => {
    // Faltar sono e faltar pressão dão o mesmo `partial`, e por isso a tela
    // precisa de uma segunda pergunta: numa clínica de pressão, "enviando só
    // parte" esconde a única parte que importa.
    const semPressao = { notifyConfirmedAppli: [1, 16, 44], notifyCheckedAt: new Date() };
    const comPressao = { notifyConfirmedAppli: [4, 16], notifyCheckedAt: new Date() };
    expect(deliveryState(semPressao)).toBe("partial");
    expect(deliveryState(comPressao)).toBe("partial");
    expect(bloodPressureMissing(semPressao)).toBe(true);
    expect(bloodPressureMissing(comPressao)).toBe(false);
  });

  it("never asked is not the same as missing", () => {
    // Um aparelho que ninguém perguntou não está "sem pressão": está sem
    // resposta. Dizer o contrário seria inventar um defeito.
    expect(bloodPressureMissing({ notifyConfirmedAppli: [], notifyCheckedAt: null })).toBe(false);
  });

  it("missingKinds names what is absent", () => {
    expect(missingKinds({ notifyConfirmedAppli: ALL })).toEqual([]);
    expect(missingKinds({ notifyConfirmedAppli: [] })).toEqual(
      expect.arrayContaining([WITHINGS_APPLI.BLOOD_PRESSURE, WITHINGS_APPLI.SLEEP])
    );
  });

  it("an old check is still a check — staleness is a different question", () => {
    const longAgo = new Date("2020-01-01T00:00:00.000Z");
    expect(deliveryState({ notifyConfirmedAppli: ALL, notifyCheckedAt: longAgo })).toBe("receiving");
  });
});
