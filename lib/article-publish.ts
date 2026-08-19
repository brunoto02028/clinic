// Publishing of articles whose scheduled slot has arrived. Called from the
// in-process scheduler (lib/background-jobs.ts) and, for a manual run, from
// POST /api/cron/article-publish.
import { prisma } from './db';

export type ArticlePublishResult = {
  checked: number;
  published: number;
  failed: number;
  results: { id: string; slug: string; success: boolean; error?: string }[];
};

export async function publishDueArticles(): Promise<ArticlePublishResult> {
  const due = await prisma.article.findMany({
    where: { published: false, scheduledAt: { lte: new Date() } },
    select: { id: true, slug: true, scheduledAt: true, createdAt: true },
  });

  const results: ArticlePublishResult["results"] = [];
  for (const article of due) {
    try {
      await prisma.article.update({
        where: { id: article.id },
        data: {
          published: true,
          scheduledAt: null,
          // createdAt is the publish date shown publicly and drives the sort
          // order. An article written weeks before its slot would otherwise go
          // live buried halfway down the list, so move it forward to the slot
          // it was scheduled for (a deliberately postdated date is kept).
          ...(article.scheduledAt && article.createdAt < article.scheduledAt
            ? { createdAt: article.scheduledAt }
            : {}),
        },
      });
      results.push({ id: article.id, slug: article.slug, success: true });
    } catch (err: any) {
      console.error(`[article-publish] Failed to publish ${article.id}:`, err);
      results.push({ id: article.id, slug: article.slug, success: false, error: err.message });
    }
  }

  const published = results.filter((r) => r.success).length;
  return { checked: due.length, published, failed: due.length - published, results };
}
