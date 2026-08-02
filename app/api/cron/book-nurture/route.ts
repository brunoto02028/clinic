export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendBookNurture3DayEmail, sendBookNurture7DayEmail, logBookEvent, BOOK_SOURCE } from "@/lib/book";

// POST /api/cron/book-nurture?key=SECRET
// Run daily. Sends the +3 day and +7 day Beyond Pain book nurture emails
// (§2.1 of BPR_Devin_Spec_Beyond_Pain_Book.md) — immediate delivery
// (confirmation + chapter unlock) already happens synchronously, see
// app/api/beyond-pain/confirm/route.ts.
// Idempotent: gated by EmailContactEvent rows, not just a date window.
export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
  if (key !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  let sent3d = 0, sent7d = 0, failed = 0;

  try {
    const threeDayCandidates = await (prisma as any).emailContact.findMany({
      where: {
        source: BOOK_SOURCE,
        confirmed: true,
        subscribed: true,
        confirmedAt: { lte: new Date(now - 3 * DAY_MS) },
      },
      select: { id: true, email: true, firstName: true, events: { select: { type: true } } },
    });

    for (const contact of threeDayCandidates) {
      if (contact.events.some((e: any) => e.type === "book_nurture_3d_sent")) continue;
      try {
        await sendBookNurture3DayEmail({ email: contact.email, firstName: contact.firstName });
        await logBookEvent(contact.id, "book_nurture_3d_sent");
        sent3d++;
      } catch (err) {
        console.error(`[book-nurture] +3d failed for ${contact.email}:`, err);
        failed++;
      }
    }

    const sevenDayCandidates = await (prisma as any).emailContact.findMany({
      where: {
        source: BOOK_SOURCE,
        confirmed: true,
        subscribed: true,
        confirmedAt: { lte: new Date(now - 7 * DAY_MS) },
      },
      select: { id: true, email: true, firstName: true, events: { select: { type: true } } },
    });

    for (const contact of sevenDayCandidates) {
      if (contact.events.some((e: any) => e.type === "book_nurture_7d_sent")) continue;
      try {
        await sendBookNurture7DayEmail({ email: contact.email, firstName: contact.firstName });
        await logBookEvent(contact.id, "book_nurture_7d_sent");
        sent7d++;
      } catch (err) {
        console.error(`[book-nurture] +7d failed for ${contact.email}:`, err);
        failed++;
      }
    }

    return NextResponse.json({ success: true, sent3d, sent7d, failed, timestamp: new Date().toISOString() });
  } catch (err: any) {
    console.error("[book-nurture] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
