import { seal, unseal } from "@/lib/crypto-at-rest";
import { prisma } from "@/lib/db";

/**
 * Withings, spoken to directly.
 *
 * The other six providers go through an aggregator. Withings is here on its
 * own because it is the only one that measures the thing this clinic actually
 * wants a daily series of — blood pressure — and because it has a public
 * OAuth2 API rather than a partner agreement. Same tables as the rest:
 * `WearableConnection` holds the tokens, readings land in the models that
 * already exist for them.
 *
 * Their API is not REST-shaped: every call is a POST with an `action` field,
 * and a 200 can still carry `status != 0`, which is the real error code.
 * `wFetch` turns that into a thrown Error so callers cannot mistake a failure
 * for an empty result.
 *
 * Credentials come from the Withings developer portal
 * (WITHINGS_CLIENT_ID / WITHINGS_CLIENT_SECRET). Without them nothing here
 * runs, and the connect route says so rather than failing silently.
 */
const AUTH_URL = "https://account.withings.com/oauth2_user/authorize2";
const TOKEN_URL = "https://wbsapi.withings.net/v2/oauth2";
const API = "https://wbsapi.withings.net";

/** Blood pressure, weight and body composition, plus sleep and activity. */
export const WITHINGS_SCOPE = "user.metrics,user.activity";

export function withingsConfigured(): boolean {
  return Boolean(process.env.WITHINGS_CLIENT_ID && process.env.WITHINGS_CLIENT_SECRET);
}

function creds() {
  const clientId = process.env.WITHINGS_CLIENT_ID;
  const clientSecret = process.env.WITHINGS_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Withings is not configured");
  return { clientId, clientSecret };
}

export function withingsAuthorizeUrl(state: string, redirectUri: string): string {
  const { clientId } = creds();
  const q = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: WITHINGS_SCOPE,
    redirect_uri: redirectUri,
    state,
  });
  return `${AUTH_URL}?${q.toString()}`;
}

async function wFetch(url: string, body: Record<string, string>): Promise<any> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  if (!res.ok) throw new Error(`Withings HTTP ${res.status}`);
  const json = await res.json();
  // A 200 with status 401 is how they report an expired token. Treating the
  // HTTP code alone as success would record an empty sync as a successful one.
  if (json?.status !== 0) {
    throw new Error(`Withings status ${json?.status}: ${json?.error || "unknown"}`);
  }
  return json.body;
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  providerUserId: string;
}

function tokensFrom(body: any): Tokens {
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: new Date(Date.now() + Number(body.expires_in ?? 3600) * 1000),
    providerUserId: String(body.userid ?? ""),
  };
}

export async function withingsExchangeCode(code: string, redirectUri: string): Promise<Tokens> {
  const { clientId, clientSecret } = creds();
  return tokensFrom(await wFetch(TOKEN_URL, {
    action: "requesttoken",
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  }));
}

async function withingsRefresh(refreshToken: string): Promise<Tokens> {
  const { clientId, clientSecret } = creds();
  return tokensFrom(await wFetch(TOKEN_URL, {
    action: "requesttoken",
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  }));
}

export async function saveWithingsTokens(connectionId: string, tokens: Tokens): Promise<void> {
  await (prisma as any).wearableConnection.update({
    where: { id: connectionId },
    data: {
      providerUserId: tokens.providerUserId || undefined,
      accessToken: seal(tokens.accessToken),
      refreshToken: seal(tokens.refreshToken),
      tokenExpiresAt: tokens.expiresAt,
      status: "CONNECTED",
    },
  });
}

/**
 * A usable access token, refreshing first if it is close to expiring.
 *
 * Withings rotates the refresh token on every refresh, so the new one has to
 * be written back or the next refresh fails — the failure mode being a
 * connection that looks healthy and quietly stops syncing.
 */
export async function withingsAccessToken(connection: {
  id: string;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
}): Promise<string> {
  const current = unseal(connection.accessToken);
  const notExpiring = connection.tokenExpiresAt
    && connection.tokenExpiresAt.getTime() - Date.now() > 60_000;
  if (current && notExpiring) return current;

  const refresh = unseal(connection.refreshToken);
  if (!refresh) throw new Error("Withings connection needs to be reauthorised");

  const tokens = await withingsRefresh(refresh);
  await saveWithingsTokens(connection.id, tokens);
  return tokens.accessToken;
}

export interface WithingsBpReading {
  systolic: number;
  diastolic: number;
  heartRate: number | null;
  measuredAt: Date;
}

/** Withings measure types, from their `getmeas` documentation. */
const TYPE_SYSTOLIC = 10;
const TYPE_DIASTOLIC = 9;
const TYPE_HEART_RATE = 11;

/**
 * Blood-pressure measurements since `since`.
 *
 * Withings returns one "measure group" per reading, each holding the separate
 * systolic/diastolic/pulse values with their own power-of-ten exponent — `1275`
 * with `unit: -1` is 127.5. A group without both halves is not a blood
 * pressure reading and is skipped rather than half-recorded.
 */
export async function withingsBloodPressure(
  accessToken: string,
  since: Date
): Promise<WithingsBpReading[]> {
  const body = await wFetch(`${API}/measure`, {
    action: "getmeas",
    access_token: accessToken,
    meastypes: [TYPE_SYSTOLIC, TYPE_DIASTOLIC, TYPE_HEART_RATE].join(","),
    category: "1", // real measurements, not user objectives
    startdate: String(Math.floor(since.getTime() / 1000)),
    enddate: String(Math.floor(Date.now() / 1000)),
  });

  const readings: WithingsBpReading[] = [];
  for (const group of body?.measuregrps ?? []) {
    const val = (type: number): number | null => {
      const m = (group.measures ?? []).find((x: any) => x.type === type);
      return m ? m.value * Math.pow(10, m.unit) : null;
    };
    const systolic = val(TYPE_SYSTOLIC);
    const diastolic = val(TYPE_DIASTOLIC);
    if (systolic == null || diastolic == null) continue;
    const heartRate = val(TYPE_HEART_RATE);
    readings.push({
      systolic: Math.round(systolic),
      diastolic: Math.round(diastolic),
      heartRate: heartRate != null ? Math.round(heartRate) : null,
      measuredAt: new Date(Number(group.date) * 1000),
    });
  }
  return readings;
}

export interface WithingsActivityDay {
  dataDate: string;
  steps: number | null;
  activeCalories: number | null;
  totalCalories: number | null;
  activeMinutes: number | null;
}

export async function withingsActivity(
  accessToken: string,
  since: Date
): Promise<WithingsActivityDay[]> {
  const iso = (d: Date) => d.toISOString().split("T")[0];
  const body = await wFetch(`${API}/v2/measure`, {
    action: "getactivity",
    access_token: accessToken,
    startdateymd: iso(since),
    enddateymd: iso(new Date()),
    data_fields: "steps,calories,totalcalories,moderate,intense",
  });

  return (body?.activities ?? []).map((a: any) => ({
    dataDate: a.date,
    steps: a.steps ?? null,
    activeCalories: a.calories ?? null,
    totalCalories: a.totalcalories ?? null,
    activeMinutes:
      a.moderate != null || a.intense != null
        ? Math.round(((a.moderate ?? 0) + (a.intense ?? 0)) / 60)
        : null,
  }));
}

export interface WithingsSleepNight {
  dataDate: string;
  sleepDuration: number | null;
  deepMinutes: number | null;
  remMinutes: number | null;
  lightMinutes: number | null;
  awakeMinutes: number | null;
  hrv: number | null;
  restingHr: number | null;
}

/** Withings reports sleep stages in seconds; this table stores minutes. */
export async function withingsSleep(
  accessToken: string,
  since: Date
): Promise<WithingsSleepNight[]> {
  const iso = (d: Date) => d.toISOString().split("T")[0];
  const body = await wFetch(`${API}/v2/sleep`, {
    action: "getsummary",
    access_token: accessToken,
    startdateymd: iso(since),
    enddateymd: iso(new Date()),
    data_fields: "deepsleepduration,lightsleepduration,remsleepduration,wakeupduration,hr_average,rr_average,sdnn_1",
  });

  const mins = (seconds: unknown) =>
    typeof seconds === "number" ? Math.round(seconds / 60) : null;

  return (body?.series ?? []).map((n: any) => {
    const d = n.data ?? {};
    const deep = mins(d.deepsleepduration);
    const light = mins(d.lightsleepduration);
    const rem = mins(d.remsleepduration);
    const awake = mins(d.wakeupduration);
    const asleep = [deep, light, rem].filter((x): x is number => x != null);
    return {
      dataDate: n.date,
      sleepDuration: asleep.length ? asleep.reduce((a, b) => a + b, 0) : null,
      deepMinutes: deep,
      remMinutes: rem,
      lightMinutes: light,
      awakeMinutes: awake,
      hrv: typeof d.sdnn_1 === "number" ? d.sdnn_1 : null,
      restingHr: typeof d.hr_average === "number" ? d.hr_average : null,
    };
  });
}
