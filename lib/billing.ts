// Validation + Stripe mapping for personal-trainer billing plans (activity 28).
// Pure/near-pure helpers; the API layer enforces access and runs Stripe on the
// connected account. Amounts are in the smallest currency unit (pence for GBP).

import type { BillingInterval } from "@prisma/client";

export interface BillingPlanInput {
  name: string;
  description?: string | null;
  amountCents: number;
  currency?: string;
  interval: BillingInterval;
}

const MIN_CENTS = 30; // Stripe minimum charge (~£0.30)
const MAX_CENTS = 5_000_00; // sane ceiling: £5,000
const INTERVALS: BillingInterval[] = ["ONE_TIME", "WEEKLY", "MONTHLY", "YEARLY"];

/** Validates a billing-plan payload. Returns an error message or null. */
export function validateBillingPlan(input: BillingPlanInput): string | null {
  if (!input || typeof input.name !== "string" || input.name.trim() === "") return "Plan name is required";
  if (input.name.length > 200) return "Plan name is too long";
  if ((input.currency || "GBP").toUpperCase() !== "GBP") return "Only GBP is supported";
  if (typeof input.amountCents !== "number" || !Number.isInteger(input.amountCents)) return "Amount is invalid";
  if (input.amountCents < MIN_CENTS) return "Amount is below the minimum (£0.30)";
  if (input.amountCents > MAX_CENTS) return "Amount is too high";
  if (!INTERVALS.includes(input.interval)) return "Interval is invalid";
  return null;
}

/** Stripe `recurring.interval` for a plan interval, or null for one-off. */
export function toStripeRecurring(interval: BillingInterval): { interval: "week" | "month" | "year" } | null {
  switch (interval) {
    case "WEEKLY": return { interval: "week" };
    case "MONTHLY": return { interval: "month" };
    case "YEARLY": return { interval: "year" };
    default: return null; // ONE_TIME
  }
}

export function isRecurring(interval: BillingInterval): boolean {
  return interval !== "ONE_TIME";
}

/**
 * Platform fee for a charge. v1 = 0 (BPR takes nothing). When a fee is wanted,
 * change here and the checkout applies application_fee_* only when > 0.
 */
export function applicationFeeCents(_amountCents: number): number {
  return 0;
}
