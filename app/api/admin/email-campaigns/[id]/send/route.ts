export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { prepareCampaign, dispatchCampaignBatch } from "@/lib/email-campaign-dispatch";

function authGuard(session: any) {
  const role = (session?.user as any)?.role;
  return session && ["SUPERADMIN", "ADMIN", "THERAPIST"].includes(role);
}

// POST /api/admin/email-campaigns/[id]/send
// action: "prepare"  — builds job queue from contacts, moves campaign to SENDING
// action: "dispatch" — sends the next pending batch (also invoked automatically
//                       by the server-side scheduler — see lib/background-jobs.ts —
//                       so remaining batches keep going even if no one is watching)
// action: "pause" / "cancel" — as named
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!authGuard(session)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { action } = await req.json();
  const campaignId = params.id;

  if (action === "prepare") {
    const result = await prepareCampaign(campaignId);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  }

  if (action === "dispatch") {
    const result = await dispatchCampaignBatch(campaignId);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  }

  if (action === "pause") {
    await (prisma as any).emailCampaign.update({ where: { id: campaignId }, data: { status: "PAUSED", nextDispatchAt: null } });
    return NextResponse.json({ paused: true });
  }

  if (action === "cancel") {
    await (prisma as any).emailCampaign.update({ where: { id: campaignId }, data: { status: "CANCELLED", nextDispatchAt: null } });
    await (prisma as any).emailCampaignJob.updateMany({
      where: { campaignId, status: "PENDING" },
      data: { status: "SKIPPED" },
    });
    return NextResponse.json({ cancelled: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// GET — campaign status + job stats
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!authGuard(session)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const campaign = await (prisma as any).emailCampaign.findUnique({
    where: { id: params.id },
    include: {
      _count: { select: { jobs: true } },
    },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const jobStats = await (prisma as any).emailCampaignJob.groupBy({
    by: ["status"],
    where: { campaignId: params.id },
    _count: { status: true },
  });

  return NextResponse.json({ campaign, jobStats });
}
