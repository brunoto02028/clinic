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

/**
 * `direct: true` means we speak to the provider ourselves rather than through
 * the aggregator — Withings is the only one that measures blood pressure, and
 * it has a public OAuth2 API instead of a partner agreement.
 *
 * `enabled` is whether the patient may be offered it **today**. Six of these
 * seven went through an aggregator whose credentials
 * (`OPEN_WEARABLES_API_URL` / `_API_KEY`) were never configured — not in
 * `.env`, not in Coolify — so the screen showed seven "Connect" buttons of
 * which six could only fail. A button that promises a door that is not there
 * is worse than no button.
 *
 * The list stays whole because the route still validates provider keys against
 * it, and because each one comes back the day its API is actually arranged.
 * Turning one on is this flag plus its credentials — nothing else.
 */
export const OW_PROVIDERS = [
  { key: 'oura', name: 'Oura Ring', icon: '💍', enabled: false },
  { key: 'garmin', name: 'Garmin', icon: '⌚', enabled: false },
  { key: 'whoop', name: 'Whoop', icon: '🏋️', enabled: false },
  { key: 'fitbit', name: 'Fitbit', icon: '📱', enabled: false },
  { key: 'polar', name: 'Polar', icon: '❄️', enabled: false },
  { key: 'strava', name: 'Strava', icon: '🚴', enabled: false },
  { key: 'withings', name: 'Withings', icon: '🩺', enabled: true },
] as const;

/** O que a tela pode oferecer. Só isto aparece para o paciente. */
export const ENABLED_PROVIDERS = OW_PROVIDERS.filter((p) => p.enabled);

export function providerEnabled(key: string): boolean {
  return OW_PROVIDERS.some((p) => p.key === key.toLowerCase() && p.enabled);
}
