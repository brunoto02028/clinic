export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { grantEntitlement, revokeEntitlement } from "@/lib/entitlements";

const WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET || "";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || "";
  if (!WEBHOOK_SECRET || authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const event = body.event;

  if (!event?.type || !event?.app_user_id) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const userId = event.app_user_id as string;
  const entitlementIds: string[] = event.entitlement_ids ?? [];
  const productId = (event.product_id as string) ?? undefined;
  const expiresAt = event.expiration_at_ms
    ? new Date(event.expiration_at_ms)
    : undefined;

  switch (event.type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL": {
      for (const featureKey of entitlementIds) {
        await grantEntitlement(userId, featureKey, "REVENUECAT", {
          externalId: productId,
          expiresAt,
          metadata: { rcEvent: event.type, productId },
        });
      }
      break;
    }

    case "CANCELLATION":
    case "EXPIRATION": {
      for (const featureKey of entitlementIds) {
        await revokeEntitlement(userId, featureKey, "REVENUECAT");
      }
      break;
    }

    default:
      // Ignore unhandled event types
      break;
  }

  return NextResponse.json({ ok: true });
}
