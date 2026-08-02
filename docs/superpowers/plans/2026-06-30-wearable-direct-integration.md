# Wearable Direct Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Oura Ring, Garmin, Whoop, and Fitbit directly (no intermediary like Terra), plus Apple HealthKit and Google Health Connect via mobile SDK. Zero recurring cost.

**Architecture:** Replace Terra API middleware with direct OAuth2/OAuth1 flows per provider. Each provider gets its own connect route and data-fetch route. The existing WearableConnection and WearableDataPoint database models are reused as-is (they're provider-agnostic). Mobile app gets a "Connect Wearable" screen + data dashboard. Future migration to Open Wearables is possible by swapping only the API layer.

**Tech Stack:** Next.js API routes (backend OAuth), Prisma (existing models), Expo/React Native (mobile), OAuth2 (Oura/Whoop/Fitbit), OAuth1 (Garmin), Apple HealthKit SDK, Google Health Connect SDK.

---

## File Map

### Backend (web - Feat-New-Layout branch)

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `lib/wearable-providers.ts` | Provider config: OAuth URLs, scopes, token refresh logic per provider |
| Create | `app/api/wearables/connect/[provider]/route.ts` | OAuth redirect for each provider (Oura, Garmin, Whoop, Fitbit) |
| Create | `app/api/wearables/callback/[provider]/route.ts` | OAuth callback - saves tokens in WearableConnection |
| Create | `app/api/wearables/sync/[provider]/route.ts` | Fetch latest data from provider API, store in WearableDataPoint |
| Create | `app/api/wearables/status/route.ts` | Get patient's connected devices + recent data |
| Create | `app/api/wearables/disconnect/route.ts` | Revoke + disconnect a provider |
| Modify | `prisma/schema.prisma` | Add accessToken, refreshToken, tokenExpiresAt to WearableConnection |
| Keep | `app/api/biohacking/terra/*` | Keep Terra routes for backward compatibility (can remove later) |

### Mobile (Feat/New-Mobile branch)

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `mobile/app/(app)/wearables.tsx` | Connect wearable screen (provider list + OAuth WebView) |
| Create | `mobile/app/(app)/wearable-data.tsx` | Data dashboard (sleep, HRV, HR, activity charts) |
| Create | `mobile/app/(app)/daily-checkin.tsx` | Daily check-in form (pain, mood, energy, sleep, stress) |
| Create | `mobile/src/api/wearables.ts` | API service: connect, disconnect, status, sync |
| Create | `mobile/src/api/daily-checkin.ts` | API service: save/fetch daily check-ins |
| Modify | `mobile/app/(app)/(tabs)/health.tsx` | Add wearable links at top of health menu |
| Modify | `mobile/app/(app)/(tabs)/index.tsx` | Add wearable summary card on home dashboard |

---

### Task 1: Update database schema for direct OAuth

**Files:**
- Modify: `prisma/schema.prisma` (WearableConnection model)

- [ ] **Step 1: Add OAuth token fields to WearableConnection**

Add these fields to the existing WearableConnection model in `prisma/schema.prisma`:

```prisma
model WearableConnection {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation("UserWearableConnections", fields: [userId], references: [id], onDelete: Cascade)
  
  terraUserId   String?  @unique  // Keep for backward compat, make nullable
  provider      String   // OURA | GARMIN | WHOOP | FITBIT | APPLE | SAMSUNG
  status        String   @default("CONNECTED")
  scopes        String?  @db.Text
  lastSyncedAt  DateTime?
  
  // Direct OAuth tokens (new)
  accessToken     String?  @db.Text
  refreshToken    String?  @db.Text
  tokenExpiresAt  DateTime?
  providerUserId  String?  // Provider's user ID (generic alternative to terraUserId)
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  dataPoints    WearableDataPoint[]
  
  @@unique([userId, provider])  // One connection per provider per user
  @@index([userId])
  @@index([terraUserId])
}
```

Key changes:
- `terraUserId` becomes nullable (backward compat)
- New: `accessToken`, `refreshToken`, `tokenExpiresAt`, `providerUserId`
- New: `@@unique([userId, provider])` compound unique

- [ ] **Step 2: Run migration**

```bash
npx prisma db push --skip-generate
npx prisma generate
```

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add OAuth token fields to WearableConnection for direct provider integration"
```

---

### Task 2: Create provider configuration

**Files:**
- Create: `lib/wearable-providers.ts`

- [ ] **Step 1: Create provider config file**

```typescript
// lib/wearable-providers.ts

export type WearableProvider = "OURA" | "GARMIN" | "WHOOP" | "FITBIT" | "APPLE" | "SAMSUNG";

export interface ProviderConfig {
  key: WearableProvider;
  name: string;
  icon: string; // emoji or icon name
  authType: "oauth2" | "oauth1";
  authUrl: string;
  tokenUrl: string;
  apiBase: string;
  scopes: string[];
  clientIdEnv: string;
  clientSecretEnv: string;
  mobileOnly?: boolean; // Apple HealthKit, Google Health Connect
}

export const PROVIDERS: Record<string, ProviderConfig> = {
  OURA: {
    key: "OURA",
    name: "Oura Ring",
    icon: "💍",
    authType: "oauth2",
    authUrl: "https://cloud.ouraring.com/oauth/authorize",
    tokenUrl: "https://api.ouraring.com/oauth/token",
    apiBase: "https://api.ouraring.com/v2",
    scopes: ["daily", "heartrate", "workout", "sleep", "spo2"],
    clientIdEnv: "OURA_CLIENT_ID",
    clientSecretEnv: "OURA_CLIENT_SECRET",
  },
  GARMIN: {
    key: "GARMIN",
    name: "Garmin",
    icon: "⌚",
    authType: "oauth1",
    authUrl: "https://connect.garmin.com/oauthConfirm",
    tokenUrl: "https://connectapi.garmin.com/oauth-service/oauth/access_token",
    apiBase: "https://apis.garmin.com/wellness-api/rest",
    scopes: [],
    clientIdEnv: "GARMIN_CONSUMER_KEY",
    clientSecretEnv: "GARMIN_CONSUMER_SECRET",
  },
  WHOOP: {
    key: "WHOOP",
    name: "Whoop",
    icon: "🏋️",
    authType: "oauth2",
    authUrl: "https://api.prod.whoop.com/oauth/oauth2/auth",
    tokenUrl: "https://api.prod.whoop.com/oauth/oauth2/token",
    apiBase: "https://api.prod.whoop.com/developer/v1",
    scopes: ["read:recovery", "read:sleep", "read:workout", "read:body_measurement", "read:profile"],
    clientIdEnv: "WHOOP_CLIENT_ID",
    clientSecretEnv: "WHOOP_CLIENT_SECRET",
  },
  FITBIT: {
    key: "FITBIT",
    name: "Fitbit",
    icon: "📱",
    authType: "oauth2",
    authUrl: "https://www.fitbit.com/oauth2/authorize",
    tokenUrl: "https://api.fitbit.com/oauth2/token",
    apiBase: "https://api.fitbit.com/1.2/user/-",
    scopes: ["activity", "heartrate", "sleep", "profile", "oxygen_saturation"],
    clientIdEnv: "FITBIT_CLIENT_ID",
    clientSecretEnv: "FITBIT_CLIENT_SECRET",
  },
  APPLE: {
    key: "APPLE",
    name: "Apple Health",
    icon: "🍎",
    authType: "oauth2",
    authUrl: "",
    tokenUrl: "",
    apiBase: "",
    scopes: [],
    clientIdEnv: "",
    clientSecretEnv: "",
    mobileOnly: true,
  },
  SAMSUNG: {
    key: "SAMSUNG",
    name: "Google Health Connect",
    icon: "🤖",
    authType: "oauth2",
    authUrl: "",
    tokenUrl: "",
    apiBase: "",
    scopes: [],
    clientIdEnv: "",
    clientSecretEnv: "",
    mobileOnly: true,
  },
};

export const WEB_PROVIDERS = Object.values(PROVIDERS).filter(p => !p.mobileOnly);
export const MOBILE_ONLY_PROVIDERS = Object.values(PROVIDERS).filter(p => p.mobileOnly);

export function getProvider(key: string): ProviderConfig | undefined {
  return PROVIDERS[key.toUpperCase()];
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/wearable-providers.ts
git commit -m "feat: add wearable provider config (Oura, Garmin, Whoop, Fitbit, Apple, Samsung)"
```

---

### Task 3: Create OAuth connect + callback routes

**Files:**
- Create: `app/api/wearables/connect/[provider]/route.ts`
- Create: `app/api/wearables/callback/[provider]/route.ts`

- [ ] **Step 1: Create connect route (OAuth redirect)**

```typescript
// app/api/wearables/connect/[provider]/route.ts
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getProvider } from "@/lib/wearable-providers";
import crypto from "crypto";

export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const provider = getProvider(params.provider);
  if (!provider || provider.mobileOnly) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const clientId = process.env[provider.clientIdEnv];
  if (!clientId) {
    return NextResponse.json({ error: "Provider not configured" }, { status: 500 });
  }

  const baseUrl = process.env.NEXTAUTH_URL || "https://bpr.rehab";
  const redirectUri = `${baseUrl}/api/wearables/callback/${params.provider.toLowerCase()}`;
  const state = crypto.randomBytes(16).toString("hex") + ":" + (session.user as any).id;

  if (provider.authType === "oauth2") {
    const url = new URL(provider.authUrl);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", provider.scopes.join(" "));
    url.searchParams.set("state", state);

    return NextResponse.redirect(url.toString());
  }

  // OAuth1 (Garmin) - simplified, would need oauth1 library
  return NextResponse.json({ error: "OAuth1 not yet implemented" }, { status: 501 });
}
```

- [ ] **Step 2: Create callback route (token exchange)**

```typescript
// app/api/wearables/callback/[provider]/route.ts
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getProvider } from "@/lib/wearable-providers";

export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  const provider = getProvider(params.provider);
  if (!provider) {
    return NextResponse.redirect(new URL("/dashboard?error=invalid_provider", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard?error=oauth_failed", request.url));
  }

  const userId = state.split(":")[1];
  if (!userId) {
    return NextResponse.redirect(new URL("/dashboard?error=invalid_state", request.url));
  }

  const clientId = process.env[provider.clientIdEnv] || "";
  const clientSecret = process.env[provider.clientSecretEnv] || "";
  const baseUrl = process.env.NEXTAUTH_URL || "https://bpr.rehab";
  const redirectUri = `${baseUrl}/api/wearables/callback/${params.provider.toLowerCase()}`;

  try {
    // Exchange code for tokens
    const tokenRes = await fetch(provider.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenRes.ok) {
      console.error("Token exchange failed:", await tokenRes.text());
      return NextResponse.redirect(new URL("/dashboard?error=token_failed", request.url));
    }

    const tokens = await tokenRes.json();

    // Save connection
    await prisma.wearableConnection.upsert({
      where: { userId_provider: { userId, provider: provider.key } },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        tokenExpiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        status: "CONNECTED",
        lastSyncedAt: new Date(),
      },
      create: {
        userId,
        provider: provider.key,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        tokenExpiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        status: "CONNECTED",
        lastSyncedAt: new Date(),
      },
    });

    return NextResponse.redirect(new URL("/dashboard?connected=1&provider=" + provider.key, request.url));
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(new URL("/dashboard?error=oauth_error", request.url));
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/wearables/
git commit -m "feat: add OAuth connect + callback routes for direct wearable integration"
```

---

### Task 4: Create data sync routes per provider

**Files:**
- Create: `app/api/wearables/sync/[provider]/route.ts`

- [ ] **Step 1: Create sync route that fetches data from each provider's API**

```typescript
// app/api/wearables/sync/[provider]/route.ts
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getProvider } from "@/lib/wearable-providers";

async function refreshTokenIfNeeded(connection: any, provider: any) {
  if (!connection.tokenExpiresAt || connection.tokenExpiresAt > new Date()) {
    return connection.accessToken;
  }
  if (!connection.refreshToken) return null;

  const clientId = process.env[provider.clientIdEnv] || "";
  const clientSecret = process.env[provider.clientSecretEnv] || "";

  const res = await fetch(provider.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: connection.refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) return null;
  const tokens = await res.json();

  await prisma.wearableConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || connection.refreshToken,
      tokenExpiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null,
    },
  });

  return tokens.access_token;
}

async function fetchOuraData(token: string, date: string) {
  const [sleepRes, hrRes] = await Promise.all([
    fetch(`https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${date}&end_date=${date}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
    fetch(`https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${date}&end_date=${date}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  ]);

  const sleep = sleepRes.ok ? await sleepRes.json() : { data: [] };
  const readiness = hrRes.ok ? await hrRes.json() : { data: [] };

  const s = sleep.data?.[0] || {};
  const r = readiness.data?.[0] || {};

  return {
    sleepScore: s.score ?? null,
    sleepDuration: s.contributors?.total_sleep ? Math.round(s.contributors.total_sleep / 60) : null,
    remMinutes: s.contributors?.rem_sleep ? Math.round(s.contributors.rem_sleep / 60) : null,
    deepMinutes: s.contributors?.deep_sleep ? Math.round(s.contributors.deep_sleep / 60) : null,
    hrv: r.contributors?.hrv_balance ?? null,
    restingHr: r.contributors?.resting_heart_rate ?? null,
  };
}

async function fetchWhoopData(token: string, date: string) {
  const [sleepRes, recoveryRes] = await Promise.all([
    fetch(`https://api.prod.whoop.com/developer/v1/activity/sleep?start=${date}&end=${date}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
    fetch(`https://api.prod.whoop.com/developer/v1/recovery?start=${date}&end=${date}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  ]);

  const sleep = sleepRes.ok ? await sleepRes.json() : { records: [] };
  const recovery = recoveryRes.ok ? await recoveryRes.json() : { records: [] };

  const s = sleep.records?.[0]?.score || {};
  const r = recovery.records?.[0]?.score || {};

  return {
    sleepScore: s.sleep_performance_percentage ?? null,
    sleepDuration: s.total_sleep_duration ? Math.round(s.total_sleep_duration / 60000) : null,
    remMinutes: s.rem_sleep_duration ? Math.round(s.rem_sleep_duration / 60000) : null,
    deepMinutes: s.slow_wave_sleep_duration ? Math.round(s.slow_wave_sleep_duration / 60000) : null,
    hrv: r.hrv_rmssd_milli ?? null,
    restingHr: r.resting_heart_rate ?? null,
  };
}

async function fetchFitbitData(token: string, date: string) {
  const sleepRes = await fetch(`https://api.fitbit.com/1.2/user/-/sleep/date/${date}.json`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const sleep = sleepRes.ok ? await sleepRes.json() : { summary: {} };
  const s = sleep.summary || {};

  return {
    sleepScore: s.stages ? Math.round((s.totalMinutesAsleep / s.totalTimeInBed) * 100) : null,
    sleepDuration: s.totalMinutesAsleep ?? null,
    remMinutes: s.stages?.rem ?? null,
    deepMinutes: s.stages?.deep ?? null,
    lightMinutes: s.stages?.light ?? null,
    awakeMinutes: s.stages?.wake ?? null,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const provider = getProvider(params.provider);
  if (!provider || provider.mobileOnly) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const connection = await prisma.wearableConnection.findUnique({
    where: { userId_provider: { userId, provider: provider.key } },
  });

  if (!connection || connection.status !== "CONNECTED") {
    return NextResponse.json({ error: "Not connected" }, { status: 400 });
  }

  const token = await refreshTokenIfNeeded(connection, provider);
  if (!token) {
    await prisma.wearableConnection.update({
      where: { id: connection.id },
      data: { status: "ERROR" },
    });
    return NextResponse.json({ error: "Token expired" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];

  let data: any = {};
  try {
    switch (provider.key) {
      case "OURA": data = await fetchOuraData(token, today); break;
      case "WHOOP": data = await fetchWhoopData(token, today); break;
      case "FITBIT": data = await fetchFitbitData(token, today); break;
      default: return NextResponse.json({ error: "Sync not implemented for " + provider.key }, { status: 501 });
    }
  } catch (err) {
    console.error("Sync error:", err);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }

  // Store in WearableDataPoint
  await prisma.wearableDataPoint.upsert({
    where: { userId_dataDate_dataType_provider: { userId, dataDate: today, dataType: "DAILY", provider: provider.key } },
    update: { ...data, rawPayload: JSON.stringify(data), updatedAt: new Date() },
    create: {
      userId,
      connectionId: connection.id,
      dataDate: today,
      dataType: "DAILY",
      provider: provider.key,
      ...data,
      rawPayload: JSON.stringify(data),
    },
  });

  await prisma.wearableConnection.update({
    where: { id: connection.id },
    data: { lastSyncedAt: new Date() },
  });

  return NextResponse.json({ success: true, date: today, data });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/wearables/sync/
git commit -m "feat: add data sync routes for Oura, Whoop, Fitbit"
```

---

### Task 5: Create status + disconnect routes

**Files:**
- Create: `app/api/wearables/status/route.ts`
- Create: `app/api/wearables/disconnect/route.ts`

- [ ] **Step 1: Create status route**

```typescript
// app/api/wearables/status/route.ts
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { WEB_PROVIDERS, MOBILE_ONLY_PROVIDERS } from "@/lib/wearable-providers";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  const connections = await prisma.wearableConnection.findMany({
    where: { userId },
    select: {
      id: true, provider: true, status: true, lastSyncedAt: true, providerUserId: true,
    },
  });

  const dataPoints = await prisma.wearableDataPoint.findMany({
    where: { userId, dataDate: { gte: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0] } },
    orderBy: { dataDate: "desc" },
    select: {
      dataDate: true, dataType: true, provider: true,
      sleepScore: true, sleepDuration: true, hrv: true, restingHr: true,
      steps: true, activeCalories: true, spo2: true, stressScore: true,
      remMinutes: true, deepMinutes: true, lightMinutes: true,
    },
  });

  return NextResponse.json({
    connections,
    dataPoints,
    availableProviders: WEB_PROVIDERS.map(p => ({ key: p.key, name: p.name, icon: p.icon, configured: !!process.env[p.clientIdEnv] })),
    mobileOnlyProviders: MOBILE_ONLY_PROVIDERS.map(p => ({ key: p.key, name: p.name, icon: p.icon })),
  });
}
```

- [ ] **Step 2: Create disconnect route**

```typescript
// app/api/wearables/disconnect/route.ts
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { provider } = await request.json();
  const userId = (session.user as any).id;

  await prisma.wearableConnection.updateMany({
    where: { userId, provider },
    data: { status: "DISCONNECTED", accessToken: null, refreshToken: null },
  });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/wearables/status/ app/api/wearables/disconnect/
git commit -m "feat: add wearable status and disconnect routes"
```

---

### Task 6: Mobile - Create wearable API service

**Files:**
- Create: `mobile/src/api/wearables.ts`
- Create: `mobile/src/api/daily-checkin.ts`

- [ ] **Step 1: Create wearable API service**

```typescript
// mobile/src/api/wearables.ts
import { apiFetch } from "./client";

export interface WearableConnection {
  id: string;
  provider: string;
  status: string;
  lastSyncedAt: string | null;
}

export interface WearableDataPoint {
  dataDate: string;
  provider: string;
  sleepScore: number | null;
  sleepDuration: number | null;
  hrv: number | null;
  restingHr: number | null;
  steps: number | null;
  spo2: number | null;
}

export interface WearableStatus {
  connections: WearableConnection[];
  dataPoints: WearableDataPoint[];
  availableProviders: { key: string; name: string; icon: string; configured: boolean }[];
  mobileOnlyProviders: { key: string; name: string; icon: string }[];
}

export async function fetchWearableStatus(): Promise<WearableStatus> {
  return apiFetch<WearableStatus>("/api/wearables/status");
}

export async function syncProvider(provider: string): Promise<any> {
  return apiFetch(`/api/wearables/sync/${provider.toLowerCase()}`, { method: "POST" });
}

export async function disconnectProvider(provider: string): Promise<void> {
  return apiFetch("/api/wearables/disconnect", {
    method: "POST",
    body: JSON.stringify({ provider }),
  });
}

export function getConnectUrl(provider: string): string {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL || "https://bpr.rehab";
  return `${baseUrl}/api/wearables/connect/${provider.toLowerCase()}`;
}
```

- [ ] **Step 2: Create daily check-in API service**

```typescript
// mobile/src/api/daily-checkin.ts
import { apiFetch } from "./client";

export interface DailyCheckIn {
  id: string;
  checkinDate: string;
  painLevel: number;
  moodLevel: number;
  energyLevel: number | null;
  sleepQuality: number | null;
  stressLevel: number | null;
  hrv: number | null;
  exercisesDone: boolean;
  notes: string | null;
}

export async function fetchCheckIns(days: number = 7): Promise<DailyCheckIn[]> {
  return apiFetch<DailyCheckIn[]>(`/api/patient/daily-checkin?days=${days}`);
}

export async function saveCheckIn(data: Partial<DailyCheckIn>): Promise<DailyCheckIn> {
  return apiFetch<DailyCheckIn>("/api/patient/daily-checkin", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/api/wearables.ts mobile/src/api/daily-checkin.ts
git commit -m "feat: add mobile API services for wearables and daily check-in"
```

---

### Task 7: Mobile - Create wearable connect screen

**Files:**
- Create: `mobile/app/(app)/wearables.tsx`

- [ ] **Step 1: Create the screen with provider list + OAuth WebView**

This screen shows available wearable providers with connect/disconnect buttons. When connecting, it opens a WebView for OAuth. Connected devices show last sync time and a sync button.

The screen should:
- Fetch status from `/api/wearables/status`
- Show each provider as a card with name, icon, connection status
- "Connect" opens WebView with the OAuth URL
- "Sync" calls POST `/api/wearables/sync/[provider]`
- "Disconnect" calls POST `/api/wearables/disconnect`
- Show mobile-only providers (Apple, Samsung) as "Coming Soon"

- [ ] **Step 2: Commit**

```bash
git add mobile/app/(app)/wearables.tsx
git commit -m "feat: add mobile wearable connect screen"
```

---

### Task 8: Mobile - Create wearable data dashboard screen

**Files:**
- Create: `mobile/app/(app)/wearable-data.tsx`

- [ ] **Step 1: Create data dashboard showing 7-day wearable metrics**

Shows cards for: Sleep Score, HRV, Resting HR, Steps, SpO2. Each with 7-day mini trend. Uses data from `/api/wearables/status` dataPoints array.

- [ ] **Step 2: Commit**

```bash
git add mobile/app/(app)/wearable-data.tsx
git commit -m "feat: add mobile wearable data dashboard"
```

---

### Task 9: Mobile - Update health tab and home screen

**Files:**
- Modify: `mobile/app/(app)/(tabs)/health.tsx`
- Modify: `mobile/app/(app)/(tabs)/index.tsx`

- [ ] **Step 1: Add wearable links to health tab**

Add at the top of the SECTIONS array in health.tsx:
- "Wearables" → /wearables (connect devices)
- "Health Data" → /wearable-data (view data)
- "Daily Check-in" → /daily-checkin (manual entry)

- [ ] **Step 2: Add wearable summary to home tab**

Add a card on the home dashboard showing latest wearable data (sleep score, HRV, resting HR) if connected. If not connected, show a "Connect Wearable" CTA.

- [ ] **Step 3: Commit**

```bash
git add mobile/app/(app)/(tabs)/health.tsx mobile/app/(app)/(tabs)/index.tsx
git commit -m "feat: add wearable links to health tab and home dashboard"
```

---

### Task 10: Create daily check-in screen for mobile

**Files:**
- Create: `mobile/app/(app)/daily-checkin.tsx`

- [ ] **Step 1: Create daily check-in form**

Form with sliders for: Pain (0-10), Mood (1-5 emojis), Energy (1-10), Sleep Quality (1-10), Stress (1-10), HRV (optional number), Exercise done checkbox, Notes textarea.

- [ ] **Step 2: Commit**

```bash
git add mobile/app/(app)/daily-checkin.tsx
git commit -m "feat: add mobile daily check-in screen"
```

---

## Environment Variables Required

For each provider the clinic wants to use, create an app on the provider's developer portal and add the keys to Render:

| Provider | Developer Portal | Env Vars |
|----------|-----------------|----------|
| **Oura** | cloud.ouraring.com/console | `OURA_CLIENT_ID`, `OURA_CLIENT_SECRET` |
| **Garmin** | developerprogram.garmin.com | `GARMIN_CONSUMER_KEY`, `GARMIN_CONSUMER_SECRET` |
| **Whoop** | developer.whoop.com | `WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET` |
| **Fitbit** | dev.fitbit.com | `FITBIT_CLIENT_ID`, `FITBIT_CLIENT_SECRET` |

Apple HealthKit and Google Health Connect don't need API keys (they use native SDKs in the mobile app).

## Migration from Terra

The existing Terra routes in `app/api/biohacking/terra/` are kept for backward compatibility. Once all providers are migrated to direct integration, they can be removed. The database models (WearableConnection, WearableDataPoint) are shared and identical.

## Future: Open Wearables Migration

If the clinic later decides to use Open Wearables ($7/mo) instead of individual integrations:
1. Deploy Open Wearables on Render
2. Replace `app/api/wearables/*` routes with calls to Open Wearables API
3. Same database models, same mobile screens
4. The provider config in `lib/wearable-providers.ts` stays the same
