export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/cron/finance-recurring-entries — for every FinancialEntry
// marked isRecurring whose recurringDay matches today, creates this
// month's copy (PENDING, dueDate today) if one hasn't been generated yet
// this month (lastGeneratedAt). Same day-count/lastX-at idempotency
// pattern as app/api/cron/membership-invoices. Never sends anything
// anywhere — purely an internal ledger entry, staff marks it paid when it
// actually is. Call via cron: curl -X POST
// https://bpr.clinic/api/cron/finance-recurring-entries?key=SECRET
export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
  if (key !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date();
    const todayDay = today.getDate();

    const templates = await prisma.financialEntry.findMany({
      where: { isRecurring: true, recurringDay: todayDay },
    });

    let generated = 0;
    let skipped = 0;

    for (const template of templates) {
      const alreadyThisMonth =
        template.lastGeneratedAt &&
        template.lastGeneratedAt.getFullYear() === today.getFullYear() &&
        template.lastGeneratedAt.getMonth() === today.getMonth();
      if (alreadyThisMonth) {
        skipped++;
        continue;
      }

      await prisma.$transaction([
        prisma.financialEntry.create({
          data: {
            clinicId: template.clinicId,
            type: template.type,
            status: "PENDING",
            description: template.description,
            notes: template.notes,
            amount: template.amount,
            currency: template.currency,
            incomeCategory: template.incomeCategory,
            expenseCategory: template.expenseCategory,
            dueDate: today,
            patientId: template.patientId,
            patientName: template.patientName,
            supplierName: template.supplierName,
            categoryId: template.categoryId,
            // The copy itself is a one-off instance, not another
            // template — only the original keeps generating.
            isRecurring: false,
          },
        }),
        prisma.financialEntry.update({
          where: { id: template.id },
          data: { lastGeneratedAt: today },
        }),
      ]);
      generated++;
    }

    return NextResponse.json({
      success: true,
      found: templates.length,
      generated,
      skipped,
      timestamp: today.toISOString(),
    });
  } catch (err: any) {
    console.error("[finance-recurring-entries] cron error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
