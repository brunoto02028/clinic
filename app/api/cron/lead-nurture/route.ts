export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendNurture2DayEmail, sendNurture5DayEmail, logLeadMagnetEvent } from "@/lib/lead-magnet";

const BASE_URL = process.env.NEXTAUTH_URL || "https://bpr.clinic";

// POST /api/cron/lead-nurture?key=SECRET
// Run daily. Sends the +2 day and +5 day lead-magnet nurture emails (P3 of
// BPR_Devin_Spec_Website_Improvements.md) — immediate delivery (nurture
// step 1) already happens synchronously on confirm, see
// app/api/lead-magnet/confirm/route.ts.
//
// Idempotent: gated by EmailContactEvent rows ("nurture_2d_sent" /
// "nurture_5d_sent"), not just a date window, so a missed/retried run never
// double-sends.
export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
  if (key !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  let sent2d = 0, sent5d = 0, failed = 0;

  try {
    // ── +2 day nurture ──
    const twoDayCandidates = await (prisma as any).emailContact.findMany({
      where: {
        confirmed: true,
        subscribed: true,
        confirmedAt: { lte: new Date(now - 2 * DAY_MS) },
      },
      select: { id: true, email: true, firstName: true, language: true, cluster: true, events: { select: { type: true } } },
    });

    for (const contact of twoDayCandidates) {
      const alreadySent = contact.events.some((e: any) => e.type === "nurture_2d_sent");
      if (alreadySent) continue;
      try {
        let articleUrl: string | null = null;
        let articleTitle: string | null = null;
        if (contact.cluster) {
          const article = await prisma.article.findFirst({
            where: { published: true, tags: { has: contact.cluster } },
            select: { slug: true, title: true },
            orderBy: { createdAt: "desc" },
          });
          if (article) {
            articleUrl = `${BASE_URL}/articles/${article.slug}`;
            articleTitle = article.title;
          }
        }
        const isPt = (contact.language || "en") === "pt";
        await sendNurture2DayEmail({
          email: contact.email,
          firstName: contact.firstName,
          locale: isPt ? "pt" : "en",
          cluster: contact.cluster || "pain",
          articleUrl,
          articleTitle,
        });
        await logLeadMagnetEvent(contact.id, "nurture_2d_sent");
        sent2d++;
      } catch (err) {
        console.error(`[lead-nurture] +2d failed for ${contact.email}:`, err);
        failed++;
      }
    }

    // ── +5 day nurture ──
    const fiveDayCandidates = await (prisma as any).emailContact.findMany({
      where: {
        confirmed: true,
        subscribed: true,
        confirmedAt: { lte: new Date(now - 5 * DAY_MS) },
      },
      select: { id: true, email: true, firstName: true, language: true, events: { select: { type: true } } },
    });

    for (const contact of fiveDayCandidates) {
      const alreadySent = contact.events.some((e: any) => e.type === "nurture_5d_sent");
      if (alreadySent) continue;
      try {
        const isPt = (contact.language || "en") === "pt";
        await sendNurture5DayEmail({ email: contact.email, firstName: contact.firstName, locale: isPt ? "pt" : "en" });
        await logLeadMagnetEvent(contact.id, "nurture_5d_sent");
        sent5d++;
      } catch (err) {
        console.error(`[lead-nurture] +5d failed for ${contact.email}:`, err);
        failed++;
      }
    }

    return NextResponse.json({ success: true, sent2d, sent5d, failed, timestamp: new Date().toISOString() });
  } catch (err: any) {
    console.error("[lead-nurture] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
