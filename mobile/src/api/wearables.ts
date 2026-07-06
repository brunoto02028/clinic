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
] as const;
