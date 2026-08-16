/**
 * @jest-environment node
 */

// Nothing may actually be sent: the mock stands in for Resend so the test can
// read the email that would have gone out.
const sent: any[] = [];
jest.mock("@/lib/email", () => ({
  sendEmail: jest.fn(async (args: any) => {
    sent.push(args);
    return { success: true };
  }),
}));

import { buildTrackingUrl, carrierName, CARRIERS } from "@/lib/shipping-carriers";
import { sendDispatchEmail, sendOrderConfirmationEmail, buyerEmail } from "@/lib/order-emails";

beforeEach(() => { sent.length = 0; });

describe("tracking link follows the carrier actually used", () => {
  it("builds a different link per carrier for the same number", () => {
    const n = "AB123456789GB";
    const royal = buildTrackingUrl("royal_mail", n);
    const evri = buildTrackingUrl("evri", n);
    expect(royal).toContain("royalmail.com");
    expect(evri).toContain("evri.com");
    expect(royal).not.toEqual(evri);
  });

  it("lets a hand-typed URL override the carrier", () => {
    expect(buildTrackingUrl("royal_mail", "AB1", "https://custom.example/x")).toBe("https://custom.example/x");
  });

  it("has no link without a tracking number", () => {
    expect(buildTrackingUrl("evri", null)).toBeNull();
    expect(buildTrackingUrl(null, null)).toBeNull();
  });

  it("returns no link for a carrier outside the list", () => {
    expect(buildTrackingUrl("other", "AB1")).toBeNull();
  });

  it("escapes the tracking number into the URL", () => {
    expect(buildTrackingUrl("evri", "A B/1")).toContain("A%20B%2F1");
  });

  it("names every carrier it offers", () => {
    for (const c of CARRIERS) expect(carrierName(c.key)).toBe(c.name);
  });
});

describe("who the email reaches", () => {
  it("uses the guest address when there is no account", () => {
    expect(buyerEmail({ orderNumber: "X", total: 1, customerEmail: "guest@x.com" })).toBe("guest@x.com");
  });

  it("falls back to the patient account", () => {
    expect(buyerEmail({ orderNumber: "X", total: 1, patient: { email: "p@x.com" } })).toBe("p@x.com");
  });

  it("reports failure instead of throwing when there is nobody to email", async () => {
    const res = await sendDispatchEmail({ orderNumber: "X", total: 1 });
    expect(res.success).toBe(false);
    expect(sent).toHaveLength(0);
  });
});

describe("the dispatch notice", () => {
  const base = { orderNumber: "BPR-1", total: 19.99, customerEmail: "guest@x.com", customerName: "Sam" };

  it("carries the number and a link matching the carrier", async () => {
    await sendDispatchEmail({ ...base, carrier: "evri", trackingNumber: "H00123" });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("guest@x.com");
    expect(sent[0].html).toContain("H00123");
    expect(sent[0].html).toContain("evri.com");
    expect(sent[0].html).toContain("Evri");
  });

  it("still goes out for an untracked parcel, with no link", async () => {
    await sendDispatchEmail({ ...base, carrier: "royal_mail", trackingNumber: null });
    expect(sent).toHaveLength(1);
    expect(sent[0].html).toContain("untracked post");
    expect(sent[0].html).not.toContain("Track your parcel");
  });

  it("changes the link when the carrier changes", async () => {
    await sendDispatchEmail({ ...base, carrier: "royal_mail", trackingNumber: "AB1" });
    await sendDispatchEmail({ ...base, carrier: "dpd", trackingNumber: "AB1" });
    expect(sent[0].html).toContain("royalmail.com");
    expect(sent[1].html).toContain("dpd.co.uk");
  });
});

describe("the purchase confirmation", () => {
  it("reaches a guest with the order number and what was paid", async () => {
    await sendOrderConfirmationEmail({
      orderNumber: "BPR-2", total: 24.5, customerEmail: "guest@x.com", customerName: "Sam",
    });
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toContain("BPR-2");
    expect(sent[0].html).toContain("£24.50");
    expect(sent[0].html).toContain("14 days");
  });
});
