export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getActor, accessErrorResponse, AccessError } from "@/lib/tenant-access";
import { assertNutritionAccess } from "@/lib/nutrition-access";
import { getOrCreateConnectedAccount, createOnboardingLink } from "@/lib/connect";

// POST — start (or resume) Stripe Connect onboarding for the personal tenant.
// Returns a hosted onboarding URL. Idempotent: reuses the tenant's account.
export async function POST(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = await assertNutritionAccess(actor);

    const accountId = await getOrCreateConnectedAccount(clinicId);
    const url = await createOnboardingLink(accountId);
    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/connect/onboard] error:", (err as any)?.message);
    return NextResponse.json({ error: "Could not start Stripe onboarding" }, { status: 500 });
  }
}
