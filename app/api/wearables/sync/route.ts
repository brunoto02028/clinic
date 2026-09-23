export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { owSyncUser } from '@/lib/open-wearables';
import {
  withingsAccessToken,
  withingsBloodPressure,
  withingsActivity,
  withingsSleep,
} from '@/lib/withings';
import { getEffectiveUser } from '@/lib/get-effective-user';

export async function POST(request: NextRequest) {
  const eff = await getEffectiveUser();
  if (!eff) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { provider } = await request.json();
  const userId = eff.userId;

  const connection = await (prisma as any).wearableConnection.findFirst({
    where: { userId, provider: provider.toUpperCase(), status: 'CONNECTED' },
  });

  if (!connection) {
    return NextResponse.json({ error: 'Not connected' }, { status: 404 });
  }

  // Withings we read ourselves, so a sync is a real fetch that returns counts
  // rather than an instruction for someone else to do it later.
  if (provider.toLowerCase() === 'withings') {
    try {
      const counts = await syncWithings(userId, connection);
      return NextResponse.json({ ok: true, ...counts });
    } catch (e: any) {
      console.error('[wearables/sync] withings:', e?.message);
      await (prisma as any).wearableConnection.update({
        where: { id: connection.id },
        data: { status: 'ERROR' },
      });
      return NextResponse.json({ error: e?.message || 'Sync failed' }, { status: 502 });
    }
  }

  if (!connection.owUserId) {
    return NextResponse.json({ error: 'Not connected' }, { status: 404 });
  }

  await owSyncUser(provider.toLowerCase(), connection.owUserId);

  return NextResponse.json({ ok: true, message: 'Sync initiated' });
}

/** Thirty days is what the patient's own screens show. */
const WINDOW_DAYS = 30;

/**
 * Pulls Withings into the models that already hold this data.
 *
 * Blood pressure does not go to WearableDataPoint: `BloodPressureReading` is
 * where the web, the clinician's view and the app all read it from, and a
 * reading is a reading whether a cuff or a person typed it. `method` stays
 * MANUAL — the cuff measured it either way — and the reading is keyed on its
 * own timestamp so re-syncing does not duplicate it.
 */
async function syncWithings(
  userId: string,
  connection: { id: string; accessToken: string | null; refreshToken: string | null; tokenExpiresAt: Date | null }
) {
  const token = await withingsAccessToken(connection);
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } });

  const [bp, activity, sleep] = await Promise.all([
    withingsBloodPressure(token, since),
    withingsActivity(token, since),
    withingsSleep(token, since),
  ]);

  let bpSaved = 0;
  for (const r of bp) {
    const exists = await (prisma as any).bloodPressureReading.findFirst({
      where: { patientId: userId, measuredAt: r.measuredAt },
      select: { id: true },
    });
    if (exists) continue;
    await (prisma as any).bloodPressureReading.create({
      data: {
        patientId: userId,
        clinicId: me?.clinicId || null,
        systolic: r.systolic,
        diastolic: r.diastolic,
        heartRate: r.heartRate,
        method: 'MANUAL',
        measuredAt: r.measuredAt,
        notes: 'Withings',
      },
    });
    bpSaved++;
  }

  const upsertPoint = async (dataType: string, dataDate: string, fields: Record<string, unknown>) => {
    const existing = await (prisma as any).wearableDataPoint.findFirst({
      where: { userId, connectionId: connection.id, dataDate, dataType },
      select: { id: true },
    });
    if (existing) {
      await (prisma as any).wearableDataPoint.update({ where: { id: existing.id }, data: fields });
    } else {
      await (prisma as any).wearableDataPoint.create({
        data: { userId, connectionId: connection.id, dataDate, dataType, provider: 'WITHINGS', ...fields },
      });
    }
  };

  for (const a of activity) {
    await upsertPoint('ACTIVITY', a.dataDate, {
      steps: a.steps, activeCalories: a.activeCalories,
      totalCalories: a.totalCalories, activeMinutes: a.activeMinutes,
    });
  }
  for (const n of sleep) {
    await upsertPoint('SLEEP', n.dataDate, {
      sleepDuration: n.sleepDuration, deepMinutes: n.deepMinutes,
      remMinutes: n.remMinutes, lightMinutes: n.lightMinutes,
      awakeMinutes: n.awakeMinutes, hrv: n.hrv, restingHr: n.restingHr,
    });
  }

  await (prisma as any).wearableConnection.update({
    where: { id: connection.id },
    data: { lastSyncedAt: new Date(), status: 'CONNECTED' },
  });

  return { bloodPressure: bpSaved, activityDays: activity.length, sleepNights: sleep.length };
}
