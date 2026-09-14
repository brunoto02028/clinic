import { prisma } from "@/lib/db";

/**
 * The card-processing fee percentage the clinic has chosen to pass through
 * in its prices (SiteSettings.cardFeePercent — set on /admin/settings).
 * Falls back to 0 (no markup) on any lookup failure.
 */
export async function getCardFeePercent(): Promise<number> {
  try {
    const settings = await prisma.siteSettings.findFirst({ select: { cardFeePercent: true } });
    return settings?.cardFeePercent || 0;
  } catch {
    return 0;
  }
}

/**
 * Adds the fee on top of a GBP amount, rounded to the penny. Call this once,
 * at the point a price is SAVED (service prices, packages, membership plans,
 * marketplace products, treatment plans) — never at checkout time. The UK's
 * Payment Services Regulations 2017 ban showing a card surcharge as a
 * separate line item, so the fee-inclusive number has to be the one thing
 * displayed and charged everywhere downstream, not two different numbers.
 */
export function applyCardFee(amount: number, feePercent: number): number {
  if (!feePercent) return amount;
  return Math.round(amount * (1 + feePercent / 100) * 100) / 100;
}
