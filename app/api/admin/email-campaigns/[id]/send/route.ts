export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { wrapInLayout, replaceVariables } from "@/lib/email-templates";

function authGuard(session: any) {
  const role = (session?.user as any)?.role;
  return session && ["SUPERADMIN", "ADMIN", "THERAPIST"].includes(role);
}

const BASE_URL = process.env.NEXTAUTH_URL || "https://clinic.bpr.rehab";

// POST /api/admin/email-campaigns/[id]/send
// action: "prepare" — builds job queue from contacts
// action: "dispatch" — sends next pending batch
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!authGuard(session)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { action } = await req.json();
  const campaignId = params.id;

  const campaign = await (prisma as any).emailCampaign.findUnique({
    where: { id: campaignId },
    include: { group: { include: { members: { include: { contact: true } } } } },
  });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  // ── PREPARE: build job queue ──────────────────────────────────────────
  if (action === "prepare") {
    if (!["DRAFT", "PAUSED"].includes(campaign.status)) {
      return NextResponse.json({ error: "Campaign is not in DRAFT or PAUSED state" }, { status: 400 });
    }

    // Collect recipients
    let contacts: any[] = [];
    if (campaign.sendToAll) {
      contacts = await (prisma as any).emailContact.findMany({ where: { subscribed: true } });
    } else if (campaign.groupId && campaign.group) {
      contacts = campaign.group.members.map((m: any) => m.contact).filter((c: any) => c.subscribed);
    }

    if (!contacts.length) {
      return NextResponse.json({ error: "No subscribed contacts found for this campaign" }, { status: 400 });
    }

    // Delete existing pending jobs (allow re-prepare)
    await (prisma as any).emailCampaignJob.deleteMany({
      where: { campaignId, status: "PENDING" },
    });

    // Create jobs in batches
    const batchSize = campaign.batchSize || 10;
    const jobs = contacts.map((c: any, i: number) => ({
      campaignId,
      contactId: c.id,
      status: "PENDING",
      batchNumber: Math.floor(i / batchSize),
    }));

    await (prisma as any).emailCampaignJob.createMany({ data: jobs, skipDuplicates: true });

    await (prisma as any).emailCampaign.update({
      where: { id: campaignId },
      data: { status: "SENDING", totalRecipients: contacts.length, startedAt: new Date() },
    });

    return NextResponse.json({ prepared: jobs.length, batches: Math.ceil(jobs.length / batchSize) });
  }

  // ── DISPATCH: send next batch ─────────────────────────────────────────
  if (action === "dispatch") {
    if (campaign.status !== "SENDING") {
      return NextResponse.json({ error: "Campaign is not in SENDING state" }, { status: 400 });
    }

    // Get next pending batch number
    const nextBatch = await (prisma as any).emailCampaignJob.findFirst({
      where: { campaignId, status: "PENDING" },
      orderBy: { batchNumber: "asc" },
      select: { batchNumber: true },
    });

    if (!nextBatch) {
      // All done
      await (prisma as any).emailCampaign.update({
        where: { id: campaignId },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      return NextResponse.json({ done: true, message: "Campaign completed" });
    }

    const batchJobs = await (prisma as any).emailCampaignJob.findMany({
      where: { campaignId, status: "PENDING", batchNumber: nextBatch.batchNumber },
      include: { contact: true },
    });

    // Render HTML once (with placeholder vars)
    let htmlTemplate = campaign.htmlBody || "";
    if (campaign.templateSlug) {
      const tmpl = await (prisma as any).emailTemplate.findUnique({ where: { slug: campaign.templateSlug } });
      if (tmpl) htmlTemplate = tmpl.htmlBody;
    }

    let sent = 0;
    let failed = 0;

    for (const job of batchJobs) {
      const contact = job.contact;
      const recipientName = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.email;
      const unsubscribeUrl = `${BASE_URL}/unsubscribe?email=${encodeURIComponent(contact.email)}`;

      const personalised = replaceVariables(htmlTemplate, {
        recipientName,
        firstName: contact.firstName || "",
        lastName: contact.lastName || "",
        email: contact.email,
        unsubscribeUrl,
      });

      const html = await wrapInLayout(personalised, campaign.preheader || campaign.subject);
      const subject = replaceVariables(campaign.subject, { recipientName, firstName: contact.firstName || "" });

      const result = await sendEmail({
        to: contact.email,
        subject,
        html,
        from: `${campaign.fromName} <${campaign.fromEmail}>`,
        replyTo: campaign.replyTo || undefined,
      });

      if (result.success) {
        await (prisma as any).emailCampaignJob.update({
          where: { id: job.id },
          data: { status: "SENT", sentAt: new Date() },
        });
        sent++;
      } else {
        await (prisma as any).emailCampaignJob.update({
          where: { id: job.id },
          data: { status: "FAILED", error: String(result.error || "Unknown error") },
        });
        failed++;
      }
    }

    // Update campaign stats
    await (prisma as any).emailCampaign.update({
      where: { id: campaignId },
      data: {
        sentCount: { increment: sent },
        failedCount: { increment: failed },
      },
    });

    // Check if more batches remain
    const remaining = await (prisma as any).emailCampaignJob.count({
      where: { campaignId, status: "PENDING" },
    });

    return NextResponse.json({
      batchNumber: nextBatch.batchNumber,
      sent,
      failed,
      remaining,
      done: remaining === 0,
      nextDispatchMs: remaining > 0 ? campaign.batchIntervalMs : 0,
    });
  }

  // ── PAUSE ─────────────────────────────────────────────────────────────
  if (action === "pause") {
    await (prisma as any).emailCampaign.update({ where: { id: campaignId }, data: { status: "PAUSED" } });
    return NextResponse.json({ paused: true });
  }

  // ── CANCEL ────────────────────────────────────────────────────────────
  if (action === "cancel") {
    await (prisma as any).emailCampaign.update({ where: { id: campaignId }, data: { status: "CANCELLED" } });
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
