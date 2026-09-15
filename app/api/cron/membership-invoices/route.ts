export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildInvoiceForSubscription } from "@/lib/invoice-for-subscription";
import { queueInvoiceForApproval } from "@/lib/invoice-pending";

// Days per interval — used to decide whether a subscription is "due" for its
// next recurring invoice. Simple day-count rather than calendar-month math,
// same tradeoff other reminder crons in this file already make.
const INTERVAL_DAYS: Record<string, number> = {
  WEEKLY: 7,
  MONTHLY: 30,
  YEARLY: 365,
};

// POST /api/cron/membership-invoices — Generate a PENDING_APPROVAL invoice
// for each active, non-free, non-Stripe-billed membership subscription that
// is due for its next billing period (activity 41). Never sends anything —
// the admin still has to approve it, same as every other invoice.
// Call via cron: curl -X POST https://bpr.clinic/api/cron/membership-invoices?key=SECRET
export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
  if (key !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const subscriptions = await (prisma as any).patientSubscription.findMany({
      where: {
        status: "ACTIVE",
        stripeSubscriptionId: null,
        plan: { isFree: false },
      },
      include: { plan: { select: { interval: true, isFree: true } } },
    });

    const now = Date.now();
    let generated = 0;
    let skipped = 0;
    let failed = 0;

    for (const sub of subscriptions as any[]) {
      try {
        const intervalDays = INTERVAL_DAYS[sub.plan.interval] || 30;
        const last = sub.lastInvoicedAt ? new Date(sub.lastInvoicedAt).getTime() : null;
        const due = last === null || now - last >= intervalDays * 24 * 60 * 60 * 1000;
        if (!due) {
          skipped++;
          continue;
        }

        const result = await buildInvoiceForSubscription(sub.id);
        if (!result || !result.patientEmail) {
          failed++;
          continue;
        }

        await queueInvoiceForApproval({
          invoice: result.invoice,
          patientEmail: result.patientEmail,
          patientId: result.patientId,
          clinicId: result.clinicId,
        });

        await (prisma as any).patientSubscription.update({
          where: { id: sub.id },
          data: { lastInvoicedAt: new Date() },
        });
        generated++;
      } catch (err) {
        console.error(`[membership-invoices] Failed for subscription ${sub.id}:`, err);
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      found: subscriptions.length,
      generated,
      skipped,
      failed,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[membership-invoices] cron error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
