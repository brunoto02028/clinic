import { createHmac, timingSafeEqual } from "crypto";

/**
 * Signing for the wearables OAuth round trip. Server only.
 *
 * This lived in `lib/open-wearables.ts`, which a client page imports for
 * `OW_PROVIDERS` — and importing node `crypto` from there pulled a polyfill
 * into the browser bundle: /dashboard/biohacking went from 9.88 kB to 142 kB
 * of JavaScript shipped to a patient. The constants a screen needs and the
 * secrets a route needs do not belong in one file.
 */
// Fifteen minutes was generous for a redirect the patient completes in one
// sitting, and the state is replayable for its whole life. Five is still ample
// for an OAuth consent screen.
const STATE_TTL_MS = 5 * 60 * 1000;

function stateSecret(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET is required to sign the wearables OAuth state");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", stateSecret()).update(payload).digest("base64url");
}

/**
 * `self` is the ordinary case: a patient connecting their own device.
 * `clinic` is a cuff the clinic owns, connected by a staff member, whose
 * readings are attributed by measurement session (activity 074, T-14). It is
 * signed in rather than passed as a query parameter for the same reason the
 * provider is: a value the callback trusts must be one this server minted.
 */
export type WearableScope = "self" | "clinic";

export function signWearableState(
  userId: string,
  source: "web" | "app",
  provider: string,
  scope: WearableScope = "self"
): string {
  // The provider is signed in too. Without it the callback took whatever
  // `?provider=` said and wrote that, so one valid state could mark a
  // connection to a device the patient never authorised.
  const payload = `${userId}.${source}.${provider.toLowerCase()}.${scope}.${Date.now() + STATE_TTL_MS}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

/** The userId and origin a state proves, or null if it proves nothing. */
export function verifyWearableState(
  state: string | null | undefined
): { userId: string; source: "web" | "app"; provider: string; scope: WearableScope } | null {
  if (!state) return null;
  const dot = state.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = Buffer.from(state.slice(0, dot), "base64url").toString("utf8");
  const given = Buffer.from(state.slice(dot + 1));
  let expected: Buffer;
  try {
    expected = Buffer.from(sign(payload));
  } catch {
    return null;
  }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  const parts = payload.split(".");
  // A state minted before the scope existed has four parts; it is a patient's
  // own connection, which is what every one of them was.
  const [userId, source, provider] = parts;
  const scope = (parts.length === 5 ? parts[3] : "self") as WearableScope;
  const expiresAt = parts[parts.length - 1];
  if (!userId || !provider || (source !== "web" && source !== "app")) return null;
  if (scope !== "self" && scope !== "clinic") return null;
  if (!Number(expiresAt) || Number(expiresAt) < Date.now()) return null;
  return { userId, source, provider, scope };
}
