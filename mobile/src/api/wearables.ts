import { apiFetch } from "./client";

export interface WearableConnection {
  id: string;
  provider: string;
  status: string;
  lastSyncedAt: string | null;
  createdAt: string;
}

export interface WearableDataPoint {
  id: string;
  dataDate: string;
  dataType: string;
  provider: string;
  sleepDuration: number | null;
  sleepEfficiency: number | null;
  deepMinutes: number | null;
  remMinutes: number | null;
  lightMinutes: number | null;
  awakeMinutes: number | null;
  hrv: number | null;
  restingHr: number | null;
  spo2: number | null;
  steps: number | null;
  activeCalories: number | null;
  activeMinutes: number | null;
}

export async function fetchConnections(): Promise<WearableConnection[]> {
  const res = await apiFetch<{ connections: WearableConnection[] }>("/api/wearables/connections");
  return res.connections ?? [];
}

export async function fetchWearableData(days = 7): Promise<WearableDataPoint[]> {
  const res = await apiFetch<{ data: WearableDataPoint[] }>(`/api/wearables/data?days=${days}`);
  return res.data ?? [];
}

export async function syncProvider(provider: string) {
  return apiFetch<{ ok: boolean; message?: string }>("/api/wearables/sync", {
    method: "POST",
    body: JSON.stringify({ provider }),
  });
}

export async function disconnectProvider(provider: string) {
  return apiFetch<{ ok: boolean }>("/api/wearables/disconnect", {
    method: "POST",
    body: JSON.stringify({ provider }),
  });
}

export const OW_PROVIDERS = [
  { key: "oura", name: "Oura Ring", icon: "💍" },
  { key: "garmin", name: "Garmin", icon: "⌚" },
  { key: "whoop", name: "Whoop", icon: "🏋️" },
  { key: "fitbit", name: "Fitbit", icon: "📱" },
  { key: "polar", name: "Polar", icon: "❄️" },
  { key: "strava", name: "Strava", icon: "🚴" },
  { key: "withings", name: "Withings", icon: "🩺" },
] as const;

/**
 * The provider's authorisation URL, fetched with the patient's token.
 *
 * `Linking.openURL(API_URL + "/api/wearables/connect/" + key)` was the old
 * route in: a plain browser open, with no Authorization header, against an
 * endpoint that wanted a cookie session. It landed on the web login every
 * time. The URL is asked for here, authenticated, and only then opened.
 */
export async function fetchConnectUrl(provider: string): Promise<string> {
  const res = await apiFetch<{ url: string }>(
    `/api/wearables/connect/${encodeURIComponent(provider)}?format=json`
  );
  if (!res?.url) throw new Error("No authorisation URL returned");
  return res.url;
}

/**
 * Whether the patient has said they read the non-emergency notice
 * (activity 074, T-13). The server refuses to start a device connection
 * without it; the screen asks first so the refusal never has to happen.
 */
export interface MonitoringConsent {
  accepted: boolean;
  acceptedAt: string | null;
  version: string;
}

export async function fetchMonitoringConsent(): Promise<MonitoringConsent> {
  return apiFetch<MonitoringConsent>("/api/patient/monitoring-consent");
}

export async function acceptMonitoringConsent(): Promise<MonitoringConsent> {
  return apiFetch<MonitoringConsent>("/api/patient/monitoring-consent", { method: "POST" });
}
