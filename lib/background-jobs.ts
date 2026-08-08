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

const TOKEN_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours
const POST_PUBLISH_INTERVAL_MS = 15 * 60 * 1000; // every 15 minutes

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

// Guards against double-registration (e.g. dev-mode hot reload calling
// register() more than once in the same process).
declare global {
  // eslint-disable-next-line no-var
  var __bprBackgroundJobsStarted: boolean | undefined;
}

export function startBackgroundJobs() {
  if (global.__bprBackgroundJobsStarted) return;
  global.__bprBackgroundJobsStarted = true;

  console.log('[background-jobs] Starting in-process scheduler (token refresh every 6h, post publish every 15min)');

  setInterval(refreshExpiringTokens, TOKEN_REFRESH_INTERVAL_MS);
  setInterval(publishDuePosts, POST_PUBLISH_INTERVAL_MS);

  // Run once shortly after boot too, instead of waiting a full interval.
  setTimeout(refreshExpiringTokens, 30_000);
  setTimeout(publishDuePosts, 60_000);
}
