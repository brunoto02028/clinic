// Shared prepare/dispatch logic for EmailCampaign batch sends. Used by both
// app/api/admin/email-campaigns/[id]/send/route.ts (the admin UI's manual
// "Send"/"Resume" click) and the in-process background scheduler
// (lib/background-jobs.ts) that continues dispatching remaining batches on
// its own — so a send doesn't stall or silently drop the rest if the admin
// closes their browser tab or a deploy restarts the server mid-send.
import { prisma } from './db';
import { sendEmail } from './email';
import { wrapInLayout, replaceVariables } from './email-templates';
import { renderArticleNewsletter } from './article-newsletter';

const BASE_URL = process.env.NEXTAUTH_URL || 'https://clinic.bpr.rehab';

export async function prepareCampaign(campaignId: string) {
  const campaign = await (prisma as any).emailCampaign.findUnique({
    where: { id: campaignId },
    include: { group: { include: { members: { include: { contact: true } } } } },
  });
  if (!campaign) return { error: 'Campaign not found', status: 404 };
  if (!['DRAFT', 'PAUSED'].includes(campaign.status)) {
    return { error: 'Campaign is not in DRAFT or PAUSED state', status: 400 };
  }

  // Collect recipients — sendToAll > groupId > contactIds (hand-picked contacts)
  let contacts: any[] = [];
  if (campaign.sendToAll) {
    contacts = await (prisma as any).emailContact.findMany({ where: { subscribed: true } });
  } else if (campaign.groupId && campaign.group) {
    contacts = campaign.group.members.map((m: any) => m.contact).filter((c: any) => c.subscribed);
  } else if (campaign.contactIds?.length) {
    contacts = await (prisma as any).emailContact.findMany({
      where: { id: { in: campaign.contactIds }, subscribed: true },
    });
  }

  if (!contacts.length) return { error: 'No subscribed contacts found for this campaign', status: 400 };

  // Delete existing pending jobs (allow re-prepare on resume from PAUSED)
  await (prisma as any).emailCampaignJob.deleteMany({ where: { campaignId, status: 'PENDING' } });

  const batchSize = campaign.batchSize || 10;
  const jobs = contacts.map((c: any, i: number) => ({
    campaignId,
    contactId: c.id,
    status: 'PENDING',
    batchNumber: Math.floor(i / batchSize),
  }));

  await (prisma as any).emailCampaignJob.createMany({ data: jobs, skipDuplicates: true });

  await (prisma as any).emailCampaign.update({
    where: { id: campaignId },
    data: {
      status: 'SENDING',
      totalRecipients: contacts.length,
      startedAt: campaign.startedAt || new Date(),
      nextDispatchAt: new Date(), // due immediately — the caller dispatches batch 1 right away
    },
  });

  return { prepared: jobs.length, batches: Math.ceil(jobs.length / batchSize) };
}

export async function dispatchCampaignBatch(campaignId: string) {
  const campaign = await (prisma as any).emailCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return { error: 'Campaign not found', status: 404 };
  if (campaign.status !== 'SENDING') return { error: 'Campaign is not in SENDING state', status: 400 };

  const nextBatch = await (prisma as any).emailCampaignJob.findFirst({
    where: { campaignId, status: 'PENDING' },
    orderBy: { batchNumber: 'asc' },
    select: { batchNumber: true },
  });

  if (!nextBatch) {
    await (prisma as any).emailCampaign.update({
      where: { id: campaignId },
      data: { status: 'COMPLETED', completedAt: new Date(), nextDispatchAt: null },
    });
    return { done: true, message: 'Campaign completed' };
  }

  const batchJobs = await (prisma as any).emailCampaignJob.findMany({
    where: { campaignId, status: 'PENDING', batchNumber: nextBatch.batchNumber },
    include: { contact: true },
  });

  const article = campaign.articleId
    ? await prisma.article.findUnique({ where: { id: campaign.articleId } })
    : null;

  let htmlTemplate = campaign.htmlBody || '';
  if (!article && campaign.templateSlug) {
    const tmpl = await (prisma as any).emailTemplate.findUnique({ where: { slug: campaign.templateSlug } });
    if (tmpl) htmlTemplate = tmpl.htmlBody;
  }

  let sent = 0;
  let failed = 0;

  for (const job of batchJobs) {
    const contact = job.contact;
    const recipientName = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.email;
    const unsubscribeUrl = `${BASE_URL}/unsubscribe?email=${encodeURIComponent(contact.email)}`;

    let html: string;
    let subject: string;

    if (article) {
      const locale: 'en' | 'pt' = contact.language === 'pt' ? 'pt' : 'en';
      const rendered = await renderArticleNewsletter(article as any, locale, recipientName, unsubscribeUrl);
      if (!rendered) {
        await (prisma as any).emailCampaignJob.update({
          where: { id: job.id },
          data: { status: 'FAILED', error: 'ARTICLE_NEWSLETTER template not available' },
        });
        failed++;
        continue;
      }
      html = rendered.html;
      subject = rendered.subject;
    } else {
      const personalised = replaceVariables(htmlTemplate, {
        recipientName,
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        email: contact.email,
        unsubscribeUrl,
      });
      html = await wrapInLayout(personalised, campaign.preheader || campaign.subject);
      subject = replaceVariables(campaign.subject, { recipientName, firstName: contact.firstName || '' });
    }

    const result = await sendEmail({
      to: contact.email,
      subject,
      html,
      from: `${campaign.fromName} <${campaign.fromEmail}>`,
      replyTo: campaign.replyTo || undefined,
    });

    if (result.success) {
      await (prisma as any).emailCampaignJob.update({ where: { id: job.id }, data: { status: 'SENT', sentAt: new Date() } });
      sent++;
    } else {
      await (prisma as any).emailCampaignJob.update({ where: { id: job.id }, data: { status: 'FAILED', error: String(result.error || 'Unknown error') } });
      failed++;
    }
  }

  const remaining = await (prisma as any).emailCampaignJob.count({ where: { campaignId, status: 'PENDING' } });

  await (prisma as any).emailCampaign.update({
    where: { id: campaignId },
    data: {
      sentCount: { increment: sent },
      failedCount: { increment: failed },
      nextDispatchAt: remaining > 0 ? new Date(Date.now() + (campaign.batchIntervalMs || 300000)) : null,
      ...(remaining === 0 ? { status: 'COMPLETED', completedAt: new Date() } : {}),
    },
  });

  return {
    batchNumber: nextBatch.batchNumber,
    sent,
    failed,
    remaining,
    done: remaining === 0,
    nextDispatchMs: remaining > 0 ? (campaign.batchIntervalMs || 300000) : 0,
  };
}
