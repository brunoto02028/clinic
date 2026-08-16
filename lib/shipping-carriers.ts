// lib/shipping-carriers.ts — UK carriers the clinic posts with, and how to
// build a tracking link for each. The carrier is chosen at dispatch, not by
// the customer at checkout.

export interface Carrier {
  key: string;
  name: string;
  /** Returns null when the carrier has no public tracking URL pattern. */
  trackingUrl: (trackingNumber: string) => string | null;
}

export const CARRIERS: Carrier[] = [
  { key: "royal_mail", name: "Royal Mail", trackingUrl: (n) => `https://www.royalmail.com/track-your-item#/tracking-results/${encodeURIComponent(n)}` },
  { key: "evri", name: "Evri", trackingUrl: (n) => `https://www.evri.com/track/parcel/${encodeURIComponent(n)}` },
  { key: "parcelforce", name: "Parcelforce", trackingUrl: (n) => `https://www.parcelforce.com/track-trace?trackNumber=${encodeURIComponent(n)}` },
  { key: "dpd", name: "DPD", trackingUrl: (n) => `https://track.dpd.co.uk/search?reference=${encodeURIComponent(n)}` },
  { key: "yodel", name: "Yodel", trackingUrl: (n) => `https://www.yodel.co.uk/track/${encodeURIComponent(n)}` },
  { key: "dhl", name: "DHL", trackingUrl: (n) => `https://www.dhl.com/gb-en/home/tracking.html?tracking-id=${encodeURIComponent(n)}` },
  { key: "ups", name: "UPS", trackingUrl: (n) => `https://www.ups.com/track?tracknum=${encodeURIComponent(n)}` },
  // For anything else: the number is still shown, just without a link.
  { key: "other", name: "Other", trackingUrl: () => null },
];

export function carrierByKey(key: string | null | undefined): Carrier | null {
  if (!key) return null;
  return CARRIERS.find((c) => c.key === key) || null;
}

export function carrierName(key: string | null | undefined): string | null {
  return carrierByKey(key)?.name ?? null;
}

/**
 * The link the customer follows. A URL typed in by hand always wins — it
 * covers carriers not in the list and one-off cases. Otherwise it is built
 * from the chosen carrier. Returns null when there is nothing to link to,
 * which is a valid state: a parcel can be posted untracked.
 */
export function buildTrackingUrl(
  carrierKey: string | null | undefined,
  trackingNumber: string | null | undefined,
  manualUrl?: string | null
): string | null {
  if (manualUrl) return manualUrl;
  if (!trackingNumber) return null;
  return carrierByKey(carrierKey)?.trackingUrl(trackingNumber) ?? null;
}
