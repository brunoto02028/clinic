import { createHmac, timingSafeEqual } from "crypto";

const OW_BASE = process.env.OPEN_WEARABLES_API_URL || '';
const OW_KEY = process.env.OPEN_WEARABLES_API_KEY || '';

async function owFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${OW_BASE}/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Open-Wearables-API-Key': OW_KEY,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OW API ${res.status}: ${text}`);
  }
  return res.json();
}

export async function owCreateUser(email: string, externalUserId: string) {
  return owFetch('/users', {
    method: 'POST',
    body: JSON.stringify({ email, external_user_id: externalUserId }),
  });
}

export async function owGetUser(owUserId: string) {
  return owFetch(`/users/${owUserId}`);
}

export async function owGetAuthUrl(provider: string, owUserId: string, redirectUri: string) {
  return owFetch(`/oauth/${provider}/authorize?user_id=${owUserId}&redirect_uri=${encodeURIComponent(redirectUri)}`);
}

export async function owGetConnections(owUserId: string) {
  return owFetch(`/users/${owUserId}/connections`);
}

export async function owDisconnect(owUserId: string, provider: string) {
  return owFetch(`/users/${owUserId}/connections/${provider}`, { method: 'DELETE' });
}

export async function owSyncUser(provider: string, owUserId: string) {
  return owFetch(`/providers/${provider}/users/${owUserId}/sync`, { method: 'POST' });
}

export async function owGetSleepSummary(owUserId: string, startDate: string, endDate: string) {
  return owFetch(`/users/${owUserId}/summaries/sleep?start_date=${startDate}&end_date=${endDate}`);
}

export async function owGetActivitySummary(owUserId: string, startDate: string, endDate: string) {
  return owFetch(`/users/${owUserId}/summaries/activity?start_date=${startDate}&end_date=${endDate}`);
}

export async function owGetRecoverySummary(owUserId: string, startDate: string, endDate: string) {
  return owFetch(`/users/${owUserId}/summaries/recovery?start_date=${startDate}&end_date=${endDate}`);
}

export async function owGetBodySummary(owUserId: string, startDate: string, endDate: string) {
  return owFetch(`/users/${owUserId}/summaries/body?start_date=${startDate}&end_date=${endDate}`);
}

export async function owGetTimeseries(owUserId: string, types: string, startTime: string, endTime: string) {
  return owFetch(`/users/${owUserId}/timeseries?types=${types}&start_time=${startTime}&end_time=${endTime}`);
}

export async function owGetHealthScores(owUserId: string) {
  return owFetch(`/users/${owUserId}/health-scores`);
}

export const OW_PROVIDERS = [
  { key: 'oura', name: 'Oura Ring', icon: '💍' },
  { key: 'garmin', name: 'Garmin', icon: '⌚' },
  { key: 'whoop', name: 'Whoop', icon: '🏋️' },
  { key: 'fitbit', name: 'Fitbit', icon: '📱' },
  { key: 'polar', name: 'Polar', icon: '❄️' },
  { key: 'strava', name: 'Strava', icon: '🚴' },
] as const;

/**
 * A signed, expiring handle for the OAuth round trip.
 *
 * The callback used to read `userId` straight out of the query string and
 * upsert a WearableConnection for it — unauthenticated, with the subject
 * supplied by whoever called it. Anyone could mark any patient as connected to
 * any provider. The provider echoes our redirect URI back verbatim, so the
 * state has to prove on its own who started the flow.
 */
const STATE_TTL_MS = 15 * 60 * 1000;

function stateSecret(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET is required to sign the wearables OAuth state");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", stateSecret()).update(payload).digest("base64url");
}

export function signWearableState(userId: string, source: "web" | "app"): string {
  const payload = `${userId}.${source}.${Date.now() + STATE_TTL_MS}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

/** The userId and origin a state proves, or null if it proves nothing. */
export function verifyWearableState(
  state: string | null | undefined
): { userId: string; source: "web" | "app" } | null {
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

  const [userId, source, expiresAt] = payload.split(".");
  if (!userId || (source !== "web" && source !== "app")) return null;
  if (!Number(expiresAt) || Number(expiresAt) < Date.now()) return null;
  return { userId, source };
}
