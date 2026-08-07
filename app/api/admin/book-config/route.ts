import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getBookConfig, BOOK_SOURCE } from "@/lib/book";

export const dynamic = "force-dynamic";

function authGuard(session: any) {
  return session?.user && ["SUPERADMIN", "ADMIN"].includes((session.user as any).role);
}

// GET — config + funnel (captured → confirmed → unlocked)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!authGuard(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const config = await getBookConfig();

    const [captured, confirmed, unlocked, booked] = await Promise.all([
      (prisma as any).emailContact.count({ where: { source: BOOK_SOURCE } }),
      (prisma as any).emailContact.count({ where: { source: BOOK_SOURCE, confirmed: true } }),
      (prisma as any).emailContactEvent.count({
        where: { type: "book_unlocked", contact: { source: BOOK_SOURCE } },
      }),
      (prisma as any).emailContactEvent.count({
        where: { type: "booked", contact: { source: BOOK_SOURCE } },
      }),
    ]);

    return NextResponse.json({ config, funnel: { captured, confirmed, unlocked, booked } });
  } catch (err: any) {
    console.error("[admin/book-config] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH — update config (launch switch, copy, buy links)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!authGuard(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const config = await getBookConfig();

    const allowed = [
      "status", "title", "subtitle", "authorName", "authorBio", "authorPhoto",
      "coverImage", "buyLinkAmazon", "buyLinkDirect", "priceDisplay",
    ];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) data[key] = body[key];
    }

    const updated = await (prisma as any).bookConfig.update({ where: { id: config.id }, data });
    return NextResponse.json({ success: true, config: updated });
  } catch (err: any) {
    console.error("[admin/book-config] PATCH error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
