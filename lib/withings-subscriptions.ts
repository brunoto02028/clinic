import { prisma } from "@/lib/db";
import {
  WITHINGS_APPLI_WE_WANT,
  confirmWithingsSubscriptions,
  withingsAccessToken,
  withingsCallbackUrl,
  withingsSubscribe,
} from "@/lib/withings";

/**
 * Asking Withings to send us measurements, and then checking that it will.
 *
 * The asking has always been here; the checking is what was missing. The
 * subscribe call is deliberately best-effort — the patient is standing in
 * front of a redirect and a notification that failed to register must not cost
 * them the connection — so its failure was logged and swallowed. Nothing read
 * the log. A device could be authorised, marked CONNECTED, and never send a
 * single reading, and the only trace was a line in a container log nobody was
 * going to open (activity 075, T-10).
 *
 * Now the answer is read back from Withings and written on the connection, so
 * three different things stop looking alike: not connected, connected but
 * sending nothing, and receiving.
 *
 * Both the OAuth callback and the retry button go through here, so the two can
 * never drift apart about what "subscribed" means.
 */

export interface SubscriptionOutcome {
  confirmed: number[];
  missing: number[];
  checkedAt: Date;
}

interface TokenBearingConnection {
  id: string;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
}

/**
 * Subscribes to every kind we want, asks Withings which ones took, and records
 * it. Never throws: a connection that cannot be checked is recorded as
 * confirming nothing, which is the honest reading of "we do not know".
 */
export async function subscribeAndRecord(
  connection: TokenBearingConnection,
  accessTokenOverride?: string
): Promise<SubscriptionOutcome> {
  const callbackUrl = withingsCallbackUrl();
  const checkedAt = new Date();
  let confirmed: number[] = [];

  try {
    const token = accessTokenOverride ?? (await withingsAccessToken(connection));

    await Promise.all(
      WITHINGS_APPLI_WE_WANT.map((appli) =>
        withingsSubscribe(token, callbackUrl, appli).catch((err) =>
          console.error(`[withings-subscriptions] subscribe appli=${appli}:`, err?.message)
        )
      )
    );

    confirmed = await confirmWithingsSubscriptions(token, callbackUrl);
  } catch (err: any) {
    // A token that cannot be refreshed is exactly the case this exists to make
    // visible. Record the check, with nothing confirmed.
    console.error("[withings-subscriptions] could not check:", err?.message);
  }

  await (prisma as any).wearableConnection
    .update({
      where: { id: connection.id },
      data: { notifyConfirmedAppli: confirmed, notifyCheckedAt: checkedAt },
    })
    .catch((e: any) => console.error("[withings-subscriptions] could not record:", e?.message));

  return {
    confirmed,
    missing: WITHINGS_APPLI_WE_WANT.filter((a) => !confirmed.includes(a)),
    checkedAt,
  };
}

/**
 * What the screens say about a connection, from the two columns.
 *
 * `unchecked` is its own answer and not a failure: a connection made before
 * this existed has never been asked, and claiming it is silent would be as
 * wrong as claiming it is fine.
 */
export type DeliveryState = "receiving" | "partial" | "silent" | "unchecked";

export function deliveryState(connection: {
  notifyConfirmedAppli?: number[] | null;
  notifyCheckedAt?: Date | null;
}): DeliveryState {
  if (!connection.notifyCheckedAt) return "unchecked";
  const confirmed = connection.notifyConfirmedAppli ?? [];
  if (confirmed.length === 0) return "silent";
  // Blood pressure is the one this clinic is built around; without it the
  // connection is not doing the job even if steps are arriving.
  const hasAll = WITHINGS_APPLI_WE_WANT.every((a) => confirmed.includes(a));
  return hasAll ? "receiving" : "partial";
}
