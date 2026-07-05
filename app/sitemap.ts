import { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

const BASE_URL = "https://bpr.rehab";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/articles`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/services/mls-laser`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/services/biohacking-performance`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/services/hrv-recovery-monitoring`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/services/sleep-longevity-optimisation`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/services/electrotherapy`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/services/therapeutic-ultrasound`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/services/exercise-therapy`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/biomechanical-assessment`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/custom-insoles`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/help`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/cookies`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/cancellation-policy`, changeFrequency: "yearly", priority: 0.2 },
  ];

  // Published articles — dynamic
  let articlePages: MetadataRoute.Sitemap = [];
  try {
    const articles = await prisma.article.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });
    articlePages = articles.map((a) => ({
      url: `${BASE_URL}/articles/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch {
    // DB unavailable — static pages only
  }

  return [...staticPages, ...articlePages];
}
