import { ApiError } from "@/api/client";

/**
 * Whether this failure is the plan saying no, rather than the network.
 *
 * The distinction matters to the person holding the phone. "We could not load
 * it — try again" invites a retry that can never work; "not included in your
 * plan" tells them what is actually true and who to ask. The server already
 * says which it is — a 403 with its own message — and the screens were
 * throwing that away.
 */
export function isPlanError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403 && error.code !== "consent_required";
}

/**
 * Whether the refusal is the terms, not the plan.
 *
 * This one the patient can act on — the tick is on the last step of the
 * assessment — so it gets a way forward instead of "ask your clinic".
 */
export function isConsentError(error: unknown): boolean {
  return error instanceof ApiError && error.code === "consent_required";
}

/** The server's own words for why, when it gave any. */
export function planMessage(error: unknown): string | null {
  return error instanceof ApiError && error.status === 403 ? error.message : null;
}
