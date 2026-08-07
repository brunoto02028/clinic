export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { refreshInstagramToken } from "@/lib/instagram";

// POST /api/cron/social-token-refresh?key=SECRET
// Run daily. Instagram long-lived tokens expire after 60 days; without this,
// a token only gets refreshed when an admin happens to open the Instagram
// Connect page within 10 days of expiry (see app/api/admin/social/refresh-token
// GET) — easy to miss, and the reason the connection silently dropped before.
export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
  if (key !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenDaysFromNow = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const expiringAccounts = await (prisma as any).socialAccount.findMany({
      where: { platform: "INSTAGRAM", isActive: true, tokenExpiresAt: { lte: tenDaysFromNow } },
    });

    const results = await Promise.all(
      expiringAccounts.map((account: any) => refreshInstagramToken(account))
    );
    const refreshed = results.filter((r) => r.success).length;

    return NextResponse.json({
      checked: expiringAccounts.length,
      refreshed,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[social-token-refresh] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
