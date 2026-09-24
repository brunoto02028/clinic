import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ingestWithings } from "@/lib/withings-ingest";
import { subscribeAndRecord } from "@/lib/withings-subscriptions";

export const dynamic = "force-dynamic";

/**
 * The safety net under the webhook.
 *
 * Two places in this codebase said a scheduled sync existed — the OAuth
 * callback, explaining why a failed subscription was survivable, and the
 * clinic-device attribution, explaining why readings are deduplicated by
 * Withings' own group id. Neither was true: nothing in app/api/cron touched a
 * wearable, and the only sync was a button the patient could press. The
 * notification was the single path, so a measurement taken while the container
 * was restarting was a measurement lost, and the deduplication existed for a
 * second path that never ran (activity 075, T-11).
 *
 * Now it runs. Dedup by `grpid` is what makes it safe to overlap with the
 * webhook, and the window deliberately reaches further back than the last
 * reading: a gap is the thing being repaired, so the query has to cover it.
 *
 * Call: curl -X POST https://bpr.clinic/api/cron/wearables-sync?key=SECRET
 */

/** How far back to look beyond the last reading. A missed day is the point. */
const SLACK_DAYS = 3;
const MAX_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
  if (!cronSecret || key !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connections = await (prisma as any).wearableConnection.findMany({
    where: { provider: "WITHINGS", status: "CONNECTED" },
    select: {
      id: true,
      userId: true,
      accessToken: true,
      refreshToken: true,
      tokenExpiresAt: true,
      isClinicDevice: true,
      clinicId: true,
      lastReadingAt: true,
      lastSyncedAt: true,
      notifyCheckedAt: true,
      createdAt: true,
    },
  });

  let synced = 0;
  let withData = 0;
  let failed = 0;
  let checked = 0;
  const totals = { bloodPressure: 0, activityDays: 0, sleepNights: 0, vitalsDays: 0 };

  for (const c of connections) {
    // A connection nobody has asked about — made before the subscription check
    // existed, or whose check never reached Withings. Doing it here means it
    // no longer waits for somebody to open a screen.
    if (!c.notifyCheckedAt) {
      try {
        const outcome = await subscribeAndRecord(c);
        if (outcome.answered) checked++;
      } catch {
        // subscribeAndRecord does not throw; this is belt and braces.
      }
    }

    const anchor = c.lastReadingAt ?? c.lastSyncedAt ?? c.createdAt ?? new Date();
    const since = new Date(
      Math.max(
        new Date(anchor).getTime() - SLACK_DAYS * DAY_MS,
        Date.now() - MAX_WINDOW_DAYS * DAY_MS
      )
    );

    try {
      const counts = await ingestWithings(c.userId, c, { since });
      synced++;
      totals.bloodPressure += counts.bloodPressure;
      totals.activityDays += counts.activityDays;
      totals.sleepNights += counts.sleepNights;
      totals.vitalsDays += counts.vitalsDays;

      const arrived =
        counts.bloodPressure + counts.activityDays + counts.sleepNights + counts.vitalsDays > 0;
      if (arrived) withData++;

      // `lastSyncedAt` is "we talked"; `lastReadingAt` is "something came".
      // Writing the second on every run would make a device that has been
      // silent for a month look like it reported this morning, which is the
      // opposite of what this is for.
      await (prisma as any).wearableConnection.update({
        where: { id: c.id },
        data: arrived ? { lastSyncedAt: new Date(), lastReadingAt: new Date() } : { lastSyncedAt: new Date() },
      });
    } catch (err: any) {
      failed++;
      // One patient's expired token must not stop the other patients' sync.
      console.error(`[cron/wearables-sync] connection ${c.id}:`, err?.message);
    }
  }

  console.log(
    `[cron/wearables-sync] connections=${connections.length} synced=${synced} withData=${withData} failed=${failed} subscriptionsChecked=${checked} bp=${totals.bloodPressure}`
  );

  return NextResponse.json({
    connections: connections.length,
    synced,
    withData,
    failed,
    subscriptionsChecked: checked,
    totals,
  });
}
