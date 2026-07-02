import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

const TERRA_API_KEY = process.env.TERRA_API_KEY ?? "";

// Verify the Terra webhook signature
function verifySignature(body: string, sigHeader: string | null): boolean {
  if (!sigHeader) return false;
  const expected = crypto
    .createHmac("sha256", TERRA_API_KEY)
    .update(body)
    .digest("hex");
  return sigHeader === expected;
}

// Parse Terra's sleep payload into our flat fields
function parseSleep(sleepData: any) {
  if (!sleepData) return {};
  const summary = sleepData.sleep_durations_data?.sleep_efficiency;
  const stages  = sleepData.sleep_durations_data?.stages;
  const hrv     = sleepData.heart_rate_data?.summary?.rmssd;
  return {
    sleepScore:      sleepData.sleep_efficiency_percentage ?? null,
    sleepDuration:   sleepData.sleep_durations_data?.total_sleep_duration
                       ? sleepData.sleep_durations_data.total_sleep_duration / 60  // s -> min
                       : null,
    remMinutes:      stages?.rem     ? stages.rem / 60     : null,
    deepMinutes:     stages?.deep    ? stages.deep / 60    : null,
    lightMinutes:    stages?.light   ? stages.light / 60   : null,
    awakeMinutes:    stages?.awake   ? stages.awake / 60   : null,
    sleepEfficiency: sleepData.sleep_efficiency_percentage ?? null,
    hrv:             hrv ?? null,
  };
}

// Parse Terra's body/daily payload
function parseBody(bodyData: any) {
  if (!bodyData) return {};
  return {
    restingHr:      bodyData.heart_rate_data?.summary?.avg_hr_bpm ?? null,
    hrv:            bodyData.heart_rate_data?.summary?.rmssd       ?? null,
    spo2:           bodyData.oxygen_data?.avg_saturation_percentage ?? null,
    bodyTemperature:bodyData.temperature_data?.body ?? null,
    stressScore:    bodyData.stress_data?.stress_duration_data?.rest_stress_duration ?? null,
  };
}

// Parse Terra's activity payload
function parseActivity(actData: any) {
  if (!actData) return {};
  return {
    steps:          actData.movement_data?.steps ?? null,
    activeCalories: actData.calories_data?.net_activity_calories ?? null,
    totalCalories:  actData.calories_data?.total_burned_calories ?? null,
    activeMinutes:  actData.active_durations_data?.activity_seconds
                      ? Math.round(actData.active_durations_data.activity_seconds / 60)
                      : null,
  };
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("terra-signature");

  // Only verify in production (TERRA_API_KEY must be set)
  if (TERRA_API_KEY && !verifySignature(rawBody, sig)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, user, data } = payload;

  // ── auth webhook — user connected a provider ──
  if (type === "auth" && user?.reference_id && user?.user_id) {
    await (prisma as any).wearableConnection.upsert({
      where: { terraUserId: user.user_id },
      create: {
        userId:       user.reference_id,
        terraUserId:  user.user_id,
        provider:     user.provider ?? "UNKNOWN",
        status:       "CONNECTED",
        lastSyncedAt: new Date(),
      },
      update: {
        status:       "CONNECTED",
        provider:     user.provider ?? "UNKNOWN",
        lastSyncedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true });
  }

  // ── deauth webhook — user disconnected ──
  if (type === "deauth" && user?.user_id) {
    await (prisma as any).wearableConnection.updateMany({
      where: { terraUserId: user.user_id },
      data:  { status: "DISCONNECTED" },
    });
    return NextResponse.json({ ok: true });
  }

  // ── data webhooks ──
  if (!user?.reference_id || !user?.user_id || !Array.isArray(data)) {
    return NextResponse.json({ ok: true }); // unknown type — ignore
  }

  const connection = await (prisma as any).wearableConnection.findUnique({
    where: { terraUserId: user.user_id },
  });
  if (!connection) return NextResponse.json({ ok: true });

  const provider = user.provider ?? connection.provider ?? "UNKNOWN";

  for (const item of data) {
    const dataDate = (item.metadata?.start_time ?? item.metadata?.date ?? "").slice(0, 10);
    if (!dataDate) continue;

    let fields: Record<string, any> = { rawPayload: JSON.stringify(item) };
    let dataType = "DAILY";

    if (type === "sleep") {
      dataType = "SLEEP";
      fields = { ...fields, ...parseSleep(item) };
    } else if (type === "body") {
      dataType = "BODY";
      fields = { ...fields, ...parseBody(item) };
    } else if (type === "activity") {
      dataType = "ACTIVITY";
      fields = { ...fields, ...parseActivity(item) };
    } else if (type === "daily") {
      dataType = "DAILY";
      // daily aggregates sleep + body + activity
      fields = { ...fields, ...parseSleep(item.sleep_durations_data), ...parseBody(item) };
      if (item.activity_data) fields = { ...fields, ...parseActivity(item.activity_data) };
    }

    await (prisma as any).wearableDataPoint.upsert({
      where: {
        userId_dataDate_dataType_provider: {
          userId:   user.reference_id,
          dataDate,
          dataType,
          provider,
        },
      },
      create: {
        userId:       user.reference_id,
        connectionId: connection.id,
        dataDate,
        dataType,
        provider,
        ...fields,
      },
      update: fields,
    });
  }

  // Update lastSyncedAt
  await (prisma as any).wearableConnection.update({
    where: { id: connection.id },
    data:  { lastSyncedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
