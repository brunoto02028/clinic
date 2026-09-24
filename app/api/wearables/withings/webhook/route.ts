export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ingestWithings } from "@/lib/withings-ingest";
import { WITHINGS_APPLI } from "@/lib/withings";

/**
 * Withings notifications: a measurement arrives when it is taken.
 *
 * Until now the data only appeared on the next scheduled sync, which is fine
 * for sleep and useless for the thing this activity is built around — a
 * therapist standing next to a patient, waiting for the reading to land in the
 * right record (T-14's three-minute window has no meaning at cron speed).
 *
 * Shape of their call: `application/x-www-form-urlencoded`, with `userid`,
 * `startdate`, `enddate` and `appli`. They expect `{"status":0}` back.
 *
 * Two deliberate choices about failure:
 *
 * - **Always answer 0.** Withings disables a subscription that keeps erroring,
 *   and a disabled subscription is silent — the worst failure this endpoint
 *   has, because nothing looks broken. Whatever happens here is logged and
 *   swallowed; the scheduled sync remains the safety net.
 * - **No shared secret to verify.** Withings does not sign the body. The
 *   protection is that the `userid` must already be a connection of ours, and
 *   that nothing is trusted from the request itself: the values are fetched
 *   from Withings with our own token. A forged call can, at worst, make us
 *   re-read our own data.
 */

/** Which kinds of data each `appli` maps to, for a narrow fetch. */
const KINDS_BY_APPLI: Record<number, Array<"bp" | "activity" | "sleep">> = {
  [WITHINGS_APPLI.BLOOD_PRESSURE]: ["bp"],
  [WITHINGS_APPLI.WEIGHT]: ["bp"], // the BPM reports through the same measure feed
  [WITHINGS_APPLI.ACTIVITY]: ["activity"],
  [WITHINGS_APPLI.SLEEP]: ["sleep"],
};

export async function POST(req: NextRequest) {
  const ok = () => NextResponse.json({ status: 0 });

  try {
    const raw = await req.text();
    const form = new URLSearchParams(raw);
    const userid = form.get("userid");
    const appli = Number(form.get("appli") ?? 0);
    const startdate = Number(form.get("startdate") ?? 0);
    const enddate = Number(form.get("enddate") ?? 0);

    if (!userid) return ok();

    const connection = await (prisma as any).wearableConnection.findFirst({
      where: { provider: "WITHINGS", providerUserId: String(userid) },
      select: {
        id: true, userId: true, accessToken: true, refreshToken: true,
        tokenExpiresAt: true, status: true, isClinicDevice: true, clinicId: true,
      },
    });

    // A notification for an account we do not know is not an error on their
    // side or ours — it is a subscription left over from a disconnected
    // patient. Answering 0 keeps their retry queue from filling up.
    if (!connection || connection.status === "DISCONNECTED") return ok();

    // Their window, widened by a minute at each end: the timestamps are whole
    // seconds and their clock is not ours, and a measurement missed here would
    // wait for the next scheduled sync.
    const since = startdate ? new Date((startdate - 60) * 1000) : new Date(Date.now() - 24 * 3600_000);
    const until = enddate ? new Date((enddate + 60) * 1000) : new Date();

    const counts = await ingestWithings(connection.userId, connection, {
      since,
      until,
      kinds: KINDS_BY_APPLI[appli] ?? ["bp"],
    });

    console.log(
      `[withings/webhook] userid=${userid} appli=${appli} bp=${counts.bloodPressure} activity=${counts.activityDays} sleep=${counts.sleepNights}`
    );
    return ok();
  } catch (e: any) {
    console.error("[withings/webhook] error:", e?.message);
    return ok();
  }
}

/**
 * Withings checks the URL with a HEAD/GET before accepting a subscription.
 * An endpoint that only answers POST fails that check, and the subscription is
 * never created — with no error anywhere except a measurement that never
 * arrives.
 */
export async function GET() {
  return NextResponse.json({ status: 0 });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
