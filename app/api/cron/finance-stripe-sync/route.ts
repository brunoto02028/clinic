export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDefaultClinicId } from "@/lib/default-tenant";
import { syncStripeFinancialEntries } from "@/lib/finance-stripe-sync";

// POST /api/cron/finance-stripe-sync — runs the same Stripe sync the
// manual "Sync Stripe" button triggers (activity 073), so the Finance
// Dashboard stays current without anyone remembering to click it. Same
// auth pattern as every other cron in this file (?key= against
// CRON_SECRET/NEXTAUTH_SECRET). The manual button is session-scoped to
// whichever clinic the superadmin belongs to; unattended, this falls back
// to the platform's one configured default clinic (same resolution
// scripts/backfill-*.js already use) — fails closed (does nothing) rather
// than guessing when there's more than one and no DEFAULT_CLINIC_SLUG set.
// Call via cron: curl -X POST https://bpr.clinic/api/cron/finance-stripe-sync?key=SECRET
export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
  if (key !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clinicId = await getDefaultClinicId();
  if (!clinicId) {
    return NextResponse.json({ error: "No default clinic resolved — nothing synced" }, { status: 400 });
  }

  try {
    const result = await syncStripeFinancialEntries(clinicId);
    return NextResponse.json({ success: true, clinicId, ...result, timestamp: new Date().toISOString() });
  } catch (err: any) {
    console.error("[finance-stripe-sync] cron error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
