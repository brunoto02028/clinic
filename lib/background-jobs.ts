// In-process background scheduler — registered once via instrumentation.ts
// when the Next.js server boots. Runs inside the same long-lived Node
// process as the app itself, so it needs no external cron service, no
// Coolify scheduled task, and no one manually visiting an admin page.
//
// Before this existed, app/api/cron/social-token-refresh and
// app/api/cron/social-post-publish were real, working endpoints that
// nothing ever called — Instagram tokens only got refreshed if an admin
// happened to open the Instagram Dashboard within ~10 days of expiry, and
// "scheduled" posts never actually published themselves. This closes that
// gap for good.
import { prisma } from './db';
import { refreshInstagramToken } from './instagram';
import { publishSocialPost } from './social-publish';
import { dispatchCampaignBatch } from './email-campaign-dispatch';
import { publishDueArticles } from './article-publish';
import { generateEvidenceReport } from './evidence-report';

const TOKEN_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours
const POST_PUBLISH_INTERVAL_MS = 15 * 60 * 1000; // every 15 minutes
const EMAIL_CAMPAIGN_INTERVAL_MS = 60 * 1000; // every 1 minute
const ARTICLE_PUBLISH_INTERVAL_MS = 15 * 60 * 1000; // every 15 minutes
const EVIDENCE_REPORT_INTERVAL_MS = 2 * 60 * 1000; // every 2 minutes

async function refreshExpiringTokens() {
  try {
    const tenDaysFromNow = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const expiringAccounts = await prisma.socialAccount.findMany({
      where: { platform: 'INSTAGRAM', isActive: true, tokenExpiresAt: { lte: tenDaysFromNow } },
    });
    if (expiringAccounts.length === 0) return;

    const results = await Promise.all(
      expiringAccounts.map((account) => refreshInstagramToken(account))
    );
    const refreshed = results.filter((r) => r.success).length;
    console.log(`[background-jobs] Token refresh: checked ${expiringAccounts.length}, refreshed ${refreshed}`);
  } catch (err: any) {
    console.error('[background-jobs] Token refresh failed:', err.message);
  }
}

async function publishDuePosts() {
  try {
    const due = await prisma.socialPost.findMany({
      where: { status: 'SCHEDULED', scheduledAt: { lte: new Date() }, accountId: { not: null } },
      select: { id: true },
    });
    if (due.length === 0) return;

    let published = 0;
    for (const post of due) {
      const result = await publishSocialPost(post.id);
      if (result.success) published++;
    }
    console.log(`[background-jobs] Post publish: checked ${due.length}, published ${published}`);
  } catch (err: any) {
    console.error('[background-jobs] Post publish failed:', err.message);
  }
}

// Continues any EmailCampaign that's mid-send (status SENDING) whose next
// batch is due — this is what lets the admin close their browser tab (or
// survive a deploy restart) partway through emailing hundreds of contacts;
// previously the whole multi-hour batch sequence only kept going while the
// admin's own browser tab stayed open running a client-side setTimeout loop.
async function dispatchDueEmailCampaigns() {
  try {
    const due = await prisma.emailCampaign.findMany({
      where: { status: 'SENDING', OR: [{ nextDispatchAt: null }, { nextDispatchAt: { lte: new Date() } }] },
      select: { id: true },
    });
    if (due.length === 0) return;

    let dispatched = 0;
    for (const campaign of due) {
      const result = await dispatchCampaignBatch(campaign.id);
      if (!('error' in result)) dispatched++;
    }
    console.log(`[background-jobs] Email campaigns: checked ${due.length}, dispatched ${dispatched} batch(es)`);
  } catch (err: any) {
    console.error('[background-jobs] Email campaign dispatch failed:', err.message);
  }
}

// Publishes articles whose "Schedule Publication" slot has arrived (see the
// article editor). Same story as scheduled social posts: the date was stored
// on the record but nothing ever acted on it.
async function publishDueArticlesJob() {
  try {
    const { checked, published } = await publishDueArticles();
    if (checked === 0) return;
    console.log(`[background-jobs] Article publish: checked ${checked}, published ${published}`);
  } catch (err: any) {
    console.error('[background-jobs] Article publish failed:', err.message);
  }
}

// Fills evidence reports created as GENERATING when a patient submits their
// triage (activity 15). Each report is a slow Claude call, so it runs here
// rather than blocking the patient's submit. `attempts` caps retries so a
// persistently failing row can't loop forever; the 2-min interval comfortably
// exceeds a single generation, so a row is done (DRAFT) before the next tick.
async function generatePendingEvidenceReports() {
  try {
    // Give up on rows that crashed mid-run repeatedly, so they don't sit in
    // GENERATING forever (which would make the admin tab poll indefinitely).
    await prisma.clinicalEvidenceReport.updateMany({
      where: { status: 'GENERATING', attempts: { gte: 3 } },
      data: { status: 'DRAFT', error: 'Generation gave up after repeated failures.' },
    });

    // Claim window: a fresh row (attempts 0) is picked immediately; once claimed
    // (attempts bumped, updatedAt refreshed) it is not re-picked until the window
    // passes, so a run slower than one tick isn't processed twice. A row still
    // GENERATING after the window (process died mid-run) is retried.
    const staleBefore = new Date(Date.now() - 5 * 60 * 1000);
    const pending = await prisma.clinicalEvidenceReport.findMany({
      where: {
        status: 'GENERATING',
        attempts: { lt: 3 },
        OR: [{ attempts: 0 }, { updatedAt: { lt: staleBefore } }],
      },
      orderBy: { createdAt: 'asc' },
      take: 3,
      select: { id: true, attempts: true },
    });
    if (pending.length === 0) return;

    let done = 0;
    for (const r of pending) {
      // Conditional claim: only proceed if this row is still GENERATING with the
      // attempts value we read (guards against a concurrent tick claiming it).
      const claim = await prisma.clinicalEvidenceReport.updateMany({
        where: { id: r.id, status: 'GENERATING', attempts: r.attempts },
        data: { attempts: { increment: 1 } },
      });
      if (claim.count !== 1) continue; // someone else claimed it
      await generateEvidenceReport(r.id);
      done++;
    }
    if (done > 0) console.log(`[background-jobs] Evidence reports: processed ${done}/${pending.length}`);
  } catch (err: any) {
    console.error('[background-jobs] Evidence report generation failed:', err.message);
  }
}

// Guards against double-registration (e.g. dev-mode hot reload calling
// register() more than once in the same process).
declare global {
  // eslint-disable-next-line no-var
  var __bprBackgroundJobsStarted: boolean | undefined;
}

export function startBackgroundJobs() {
  if (global.__bprBackgroundJobsStarted) return;
  global.__bprBackgroundJobsStarted = true;

  console.log('[background-jobs] Starting in-process scheduler (token refresh every 6h, post publish every 15min, email campaigns every 1min, article publish every 15min)');

  setInterval(refreshExpiringTokens, TOKEN_REFRESH_INTERVAL_MS);
  setInterval(publishDuePosts, POST_PUBLISH_INTERVAL_MS);
  setInterval(dispatchDueEmailCampaigns, EMAIL_CAMPAIGN_INTERVAL_MS);
  setInterval(publishDueArticlesJob, ARTICLE_PUBLISH_INTERVAL_MS);
  setInterval(generatePendingEvidenceReports, EVIDENCE_REPORT_INTERVAL_MS);

  // Run once shortly after boot too, instead of waiting a full interval.
  setTimeout(refreshExpiringTokens, 30_000);
  setTimeout(publishDuePosts, 60_000);
  setTimeout(dispatchDueEmailCampaigns, 45_000);
  setTimeout(publishDueArticlesJob, 60_000);
  setTimeout(generatePendingEvidenceReports, 25_000);
}
