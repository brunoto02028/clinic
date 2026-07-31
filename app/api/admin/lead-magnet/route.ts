export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

// GET /api/admin/lead-magnet — funnel view for lead-magnet contacts (P3 of
// BPR_Devin_Spec_Website_Improvements.md): source, cluster and funnel status
// (captured -> confirmed -> downloaded -> booked), plus aggregate counts.
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["ADMIN", "SUPERADMIN", "THERAPIST"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const cluster = searchParams.get("cluster");
    const stage = searchParams.get("stage"); // "captured" | "confirmed" | "downloaded" | "booked" | "unsubscribed"
    const search = searchParams.get("search")?.trim();

    // Only lead-magnet-sourced contacts (captured via a cluster or an
    // EmailContactEvent), not every newsletter contact.
    const where: any = {
      OR: [{ cluster: { not: null } }, { events: { some: {} } }],
    };
    if (cluster) where.cluster = cluster;
    if (search) {
      where.AND = [
        ...(where.AND || []),
        { OR: [{ email: { contains: search, mode: "insensitive" } }, { firstName: { contains: search, mode: "insensitive" } }] },
      ];
    }

    const contacts = await (prisma as any).emailContact.findMany({
      where,
      select: {
        id: true, email: true, firstName: true, lastName: true, source: true,
        cluster: true, consent: true, consentAt: true, confirmed: true, confirmedAt: true,
        subscribed: true, unsubscribedAt: true, createdAt: true,
        events: { select: { type: true, createdAt: true, meta: true }, orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    const withStage = contacts.map((c: any) => {
      const types = new Set(c.events.map((e: any) => e.type));
      let currentStage: "captured" | "confirmed" | "downloaded" | "booked" | "unsubscribed" = "captured";
      if (types.has("unsubscribed")) currentStage = "unsubscribed";
      else if (types.has("booked")) currentStage = "booked";
      else if (types.has("downloaded")) currentStage = "downloaded";
      else if (c.confirmed || types.has("confirmed")) currentStage = "confirmed";
      return { ...c, stage: currentStage };
    });

    const filtered = stage ? withStage.filter((c: any) => c.stage === stage) : withStage;

    const counts = {
      total: withStage.length,
      captured: withStage.filter((c: any) => c.stage === "captured").length,
      confirmed: withStage.filter((c: any) => c.stage === "confirmed").length,
      downloaded: withStage.filter((c: any) => c.stage === "downloaded").length,
      booked: withStage.filter((c: any) => c.stage === "booked").length,
      unsubscribed: withStage.filter((c: any) => c.stage === "unsubscribed").length,
    };

    const clusters = await (prisma as any).emailContact.groupBy({
      by: ["cluster"],
      where: { cluster: { not: null } },
      _count: true,
    });

    return NextResponse.json({ contacts: filtered, counts, clusters: clusters.map((c: any) => ({ cluster: c.cluster, count: c._count })) });
  } catch (err: any) {
    console.error("[admin-lead-magnet] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
