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
  return error instanceof ApiError && error.status === 403;
}

/** The server's own words for why, when it gave any. */
export function planMessage(error: unknown): string | null {
  return error instanceof ApiError && error.status === 403 ? error.message : null;
}
