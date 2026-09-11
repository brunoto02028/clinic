import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { AccessError } from "@/lib/tenant-access";

// Stripe Connect (Express) helpers for the personal-trainer billing product
// (activity 28). A trainer's studio (Clinic) gets its own connected account;
// all billing Stripe calls run ON that account via the `stripeAccount` option.
// This module is the ONLY place billing code talks to Stripe with an account —
// billing routes must never use lib/stripe-marketplace or the naked singleton,
// or money would land in the BPR platform account.

const BASE_URL = process.env.NEXTAUTH_URL || "https://bpr.clinic";

/** Creates the connected Express account for a tenant if missing; returns its id. */
export async function getOrCreateConnectedAccount(clinicId: string): Promise<string> {
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: { id: true, stripeAccountId: true, email: true },
  });
  if (!clinic) throw new AccessError(404, "Not found");
  if (clinic.stripeAccountId) return clinic.stripeAccountId;

  const account = await stripe.accounts.create({
    type: "express",
    country: "GB",
    email: clinic.email || undefined,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: { clinicId },
  });
  await prisma.clinic.update({ where: { id: clinicId }, data: { stripeAccountId: account.id } });
  return account.id;
}

/** A hosted onboarding link for the tenant's connected account. */
export async function createOnboardingLink(accountId: string): Promise<string> {
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${BASE_URL}/admin/settings?connect=refresh`,
    return_url: `${BASE_URL}/admin/settings?connect=done`,
    type: "account_onboarding",
  });
  return link.url;
}

export interface ConnectStatus {
  connected: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  actionNeeded: boolean;
}

/** Re-reads the connected account and persists the rich onboarding state. */
export async function refreshAccountStatus(clinicId: string): Promise<ConnectStatus> {
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: { stripeAccountId: true },
  });
  if (!clinic?.stripeAccountId) {
    return { connected: false, chargesEnabled: false, payoutsEnabled: false, actionNeeded: false };
  }
  const acct = await stripe.accounts.retrieve(clinic.stripeAccountId);
  const chargesEnabled = !!acct.charges_enabled;
  const payoutsEnabled = !!acct.payouts_enabled;
  const due = acct.requirements?.currently_due ?? [];
  const actionNeeded = due.length > 0 || !!acct.requirements?.disabled_reason;
  await prisma.clinic.update({
    where: { id: clinicId },
    data: { stripeOnboarded: chargesEnabled, stripePayoutsEnabled: payoutsEnabled, stripeRequirementsDue: actionNeeded },
  });
  return { connected: true, chargesEnabled, payoutsEnabled, actionNeeded };
}

/**
 * Resolves the tenant's connected account id or throws. The single server-side
 * source of the `stripeAccount` — never taken from client input (invariant G11).
 */
export async function resolveConnectedAccount(clinicId: string): Promise<string> {
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: { stripeAccountId: true },
  });
  if (!clinic?.stripeAccountId) throw new AccessError(409, "This studio has not connected Stripe yet");
  return clinic.stripeAccountId;
}

/** Throws 409 unless the tenant can charge (charges_enabled == stripeOnboarded). */
export async function assertChargesEnabled(clinicId: string): Promise<string> {
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: { stripeAccountId: true, stripeOnboarded: true },
  });
  if (!clinic?.stripeAccountId) throw new AccessError(409, "This studio has not connected Stripe yet");
  if (!clinic.stripeOnboarded) throw new AccessError(409, "Finish your Stripe setup before charging students");
  return clinic.stripeAccountId;
}
