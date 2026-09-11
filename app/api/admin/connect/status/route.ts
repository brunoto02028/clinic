export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getActor, accessErrorResponse, AccessError } from "@/lib/tenant-access";
import { assertNutritionAccess } from "@/lib/nutrition-access";
import { refreshAccountStatus } from "@/lib/connect";

// GET — the personal tenant's Stripe Connect status (re-read from Stripe and
// persisted): { connected, chargesEnabled, payoutsEnabled, actionNeeded }.
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = await assertNutritionAccess(actor);

    const status = await refreshAccountStatus(clinicId);
    return NextResponse.json(status);
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/connect/status] error:", (err as any)?.message);
    return NextResponse.json({ error: "Could not read Stripe status" }, { status: 500 });
  }
}
