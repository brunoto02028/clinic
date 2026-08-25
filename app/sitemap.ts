import { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

const BASE_URL = process.env.NEXTAUTH_URL || "https://bpr.clinic";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/articles`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/beyond-pain`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/services/mls-laser`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/services/biohacking-performance`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/services/hrv-recovery-monitoring`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/services/sleep-longevity-optimisation`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/services/electrotherapy`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/services/therapeutic-ultrasound`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/services/exercise-therapy`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/services/microcurrent`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/services/sports-injury`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/services/chronic-pain`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/services/pre-post-surgery`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/therapies`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/biohacking`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/start`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/get-the-app`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE_URL}/help`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/cookies`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/cancellation-policy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/complaints-policy`, changeFrequency: "yearly", priority: 0.2 },
  ];

  // Published articles — dynamic. Bilingual (activity 12): each article is an EN
  // URL, plus a /pt URL when it has a Portuguese body, tied together by hreflang
  // alternates so Google indexes both languages.
  let articlePages: MetadataRoute.Sitemap = [];
  try {
    const articles = await prisma.article.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true, titlePt: true, contentPt: true },
      orderBy: { updatedAt: "desc" },
    });
    for (const a of articles) {
      const enUrl = `${BASE_URL}/articles/${a.slug}`;
      const ptUrl = `${BASE_URL}/pt/articles/${a.slug}`;
      const hasPt = !!(a.contentPt && a.contentPt.trim());
      const languages: Record<string, string> = { en: enUrl, "x-default": enUrl };
      if (hasPt) languages["pt-BR"] = ptUrl;

      articlePages.push({
        url: enUrl,
        lastModified: a.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.6,
        alternates: { languages },
      });
      if (hasPt) {
        articlePages.push({
          url: ptUrl,
          lastModified: a.updatedAt,
          changeFrequency: "monthly" as const,
          priority: 0.6,
          alternates: { languages },
        });
      }
    }
  } catch {
    // DB unavailable — static pages only
  }

  // Published condition pages (P4 SEO bridges) — dynamic
  let conditionPages: MetadataRoute.Sitemap = [];
  try {
    const conditions = await (prisma as any).conditionPage.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });
    conditionPages = conditions.map((c: any) => ({
      url: `${BASE_URL}/conditions/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch {
    // DB unavailable or table not yet migrated — skip
  }

  return [...staticPages, ...articlePages, ...conditionPages];
}
