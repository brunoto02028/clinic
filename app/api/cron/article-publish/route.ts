export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { publishDueArticles } from "@/lib/article-publish";

// POST /api/cron/article-publish?key=SECRET
// Manual/external trigger for the same job the in-process scheduler already
// runs every 15 min (see lib/background-jobs.ts): publishes any Article whose
// scheduledAt has arrived (the "Schedule Publication" field in the article
// editor). Subscribers are NOT emailed here — the newsletter stays a
// deliberate action from the articles list ("Notify subscribers").
export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
  if (key !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await publishDueArticles();
    return NextResponse.json({ ...result, timestamp: new Date().toISOString() });
  } catch (err: any) {
    console.error("[article-publish] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
