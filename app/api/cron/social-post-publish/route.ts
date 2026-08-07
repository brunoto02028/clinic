export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { publishSocialPost } from "@/lib/social-publish";

// POST /api/cron/social-post-publish?key=SECRET
// Run every 15-30 min. Publishes any SocialPost (Instagram/Facebook — see
// the Marketing → Calendar tab and prisma SocialPost model) whose
// scheduledAt has arrived. Until this existed, scheduling a post only set a
// date on the record — nothing ever actually published it; someone had to
// open it and click "Publish" by hand on the day.
export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
  if (key !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const due = await prisma.socialPost.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: { lte: new Date() },
        accountId: { not: null },
      },
      select: { id: true },
    });

    const results = [];
    for (const post of due) {
      const result = await publishSocialPost(post.id);
      results.push({ id: post.id, ...result });
    }

    const published = results.filter((r) => r.success).length;

    return NextResponse.json({
      checked: due.length,
      published,
      failed: due.length - published,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[social-post-publish] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
