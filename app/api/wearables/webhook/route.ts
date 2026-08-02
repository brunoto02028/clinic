export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.OPEN_WEARABLES_WEBHOOK_SECRET || '';

function verifySignature(payload: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) return true;
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(payload).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('x-webhook-signature') || '';

  if (WEBHOOK_SECRET && !verifySignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { type, data } = event;

  const owUserId = data?.user_id;
  if (!owUserId) return NextResponse.json({ ok: true });

  const connection = await (prisma as any).wearableConnection.findFirst({
    where: { owUserId },
  });
  if (!connection) return NextResponse.json({ ok: true });

  const userId = connection.userId;
  const provider = data.source?.provider?.toUpperCase() || connection.provider;
  const dataDate = data.date || data.start_time?.split('T')[0] || new Date().toISOString().split('T')[0];

  if (type?.startsWith('sleep.')) {
    await (prisma as any).wearableDataPoint.upsert({
      where: {
        userId_dataDate_dataType_provider: {
          userId,
          dataDate,
          dataType: 'SLEEP',
          provider,
        },
      },
      create: {
        userId,
        connectionId: connection.id,
        dataDate,
        dataType: 'SLEEP',
        provider,
        sleepDuration: data.duration_minutes ?? null,
        sleepEfficiency: data.efficiency_percent ?? null,
        remMinutes: data.stages?.rem_minutes ?? null,
        deepMinutes: data.stages?.deep_minutes ?? null,
        lightMinutes: data.stages?.light_minutes ?? null,
        awakeMinutes: data.stages?.awake_minutes ?? null,
        hrv: data.avg_hrv_rmssd_ms ?? data.avg_hrv_sdnn_ms ?? null,
        restingHr: data.avg_heart_rate_bpm ?? null,
        spo2: data.avg_spo2_percent ?? null,
        rawPayload: JSON.stringify(data),
      },
      update: {
        sleepDuration: data.duration_minutes ?? null,
        sleepEfficiency: data.efficiency_percent ?? null,
        remMinutes: data.stages?.rem_minutes ?? null,
        deepMinutes: data.stages?.deep_minutes ?? null,
        lightMinutes: data.stages?.light_minutes ?? null,
        awakeMinutes: data.stages?.awake_minutes ?? null,
        hrv: data.avg_hrv_rmssd_ms ?? data.avg_hrv_sdnn_ms ?? null,
        restingHr: data.avg_heart_rate_bpm ?? null,
        spo2: data.avg_spo2_percent ?? null,
        rawPayload: JSON.stringify(data),
      },
    });
  }

  if (type?.startsWith('activity.')) {
    await (prisma as any).wearableDataPoint.upsert({
      where: {
        userId_dataDate_dataType_provider: {
          userId,
          dataDate,
          dataType: 'ACTIVITY',
          provider,
        },
      },
      create: {
        userId,
        connectionId: connection.id,
        dataDate,
        dataType: 'ACTIVITY',
        provider,
        steps: data.steps ?? null,
        activeCalories: data.active_calories_kcal ?? null,
        totalCalories: data.total_calories_kcal ?? null,
        activeMinutes: data.active_minutes ?? null,
        rawPayload: JSON.stringify(data),
      },
      update: {
        steps: data.steps ?? null,
        activeCalories: data.active_calories_kcal ?? null,
        totalCalories: data.total_calories_kcal ?? null,
        activeMinutes: data.active_minutes ?? null,
        rawPayload: JSON.stringify(data),
      },
    });
  }

  if (type?.startsWith('recovery.')) {
    await (prisma as any).wearableDataPoint.upsert({
      where: {
        userId_dataDate_dataType_provider: {
          userId,
          dataDate,
          dataType: 'BODY',
          provider,
        },
      },
      create: {
        userId,
        connectionId: connection.id,
        dataDate,
        dataType: 'BODY',
        provider,
        hrv: data.avg_hrv_sdnn_ms ?? null,
        restingHr: data.resting_heart_rate_bpm ?? null,
        spo2: data.avg_spo2_percent ?? null,
        rawPayload: JSON.stringify(data),
      },
      update: {
        hrv: data.avg_hrv_sdnn_ms ?? null,
        restingHr: data.resting_heart_rate_bpm ?? null,
        spo2: data.avg_spo2_percent ?? null,
        rawPayload: JSON.stringify(data),
      },
    });
  }

  await (prisma as any).wearableConnection.update({
    where: { id: connection.id },
    data: { lastSyncedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
