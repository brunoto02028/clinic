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
