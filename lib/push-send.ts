/**
 * Server-side push notification sender.
 * Supports Firebase Cloud Messaging (FCM) for both iOS and Android.
 * 
 * Requirements:
 * - FIREBASE_SERVER_KEY in system config or env vars
 * - Patient must have registered a push token via /api/push-token
 */

import { prisma } from "@/lib/db";

interface PushPayload {
  title: string;
  body: string;
  url?: string;         // Deep link URL (e.g. /dashboard/tasks)
  badge?: number;
  sound?: string;
  data?: Record<string, string>;
}

/**
 * Send push notification to a specific user's devices.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<{ sent: number; failed: number }> {
  // Get all active tokens for this user
  const tokens = await (prisma as any).pushDeviceToken.findMany({
    where: { userId, active: true },
  });

  if (tokens.length === 0) {
    return { sent: 0, failed: 0 };
  }

  let firebaseKey: string | null = null;
  try {
    const { getConfigValue } = await import("@/lib/system-config");
    firebaseKey = await getConfigValue("FIREBASE_SERVER_KEY");
  } catch {}
  if (!firebaseKey) firebaseKey = process.env.FIREBASE_SERVER_KEY || null;

  if (!firebaseKey) {
    console.warn("[push-send] No FIREBASE_SERVER_KEY configured. Push notifications disabled.");
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const device of tokens) {
    try {
      const res = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `key=${firebaseKey}`,
        },
        body: JSON.stringify({
          to: device.token,
          notification: {
            title: payload.title,
            body: payload.body,
            sound: payload.sound || "default",
            badge: payload.badge,
            click_action: payload.url || "/",
          },
          data: {
            url: payload.url || "/",
            ...payload.data,
          },
          priority: "high",
        }),
      });

      const result = await res.json();

      if (result.success === 1) {
        sent++;
      } else {
        failed++;
        // If token is invalid, deactivate it
        if (result.results?.[0]?.error === "NotRegistered" || result.results?.[0]?.error === "InvalidRegistration") {
          await (prisma as any).pushDeviceToken.update({
            where: { id: device.id },
            data: { active: false },
          });
        }
      }
    } catch (err) {
      console.error("[push-send] Error sending to device:", err);
      failed++;
    }
  }

  console.log(`[push-send] User ${userId}: ${sent} sent, ${failed} failed`);
  return { sent, failed };
}

/**
 * Send push notification to multiple users at once.
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  const results = await Promise.allSettled(
    userIds.map((id) => sendPushToUser(id, payload))
  );

  const totals = { sent: 0, failed: 0 };
  for (const r of results) {
    if (r.status === "fulfilled") {
      totals.sent += r.value.sent;
      totals.failed += r.value.failed;
    }
  }
  return totals;
}
