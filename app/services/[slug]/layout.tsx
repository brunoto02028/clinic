import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n";

const BASE_URL = "https://bpr.clinic";

// Mirrors the hardcoded SERVICE_DATA slugs in ./page.tsx (a client component,
// which can't export its own metadata) — kept in sync manually since the
// full SERVICE_DATA object lives in a client file with React icon imports.
const SERVICE_META: Record<string, { titleKey: string; descKey: string }> = {
  electrotherapy: { titleKey: "svc.electrotherapy", descKey: "svc.electrotherapyDesc" },
  "exercise-therapy": { titleKey: "svc.exerciseTherapy", descKey: "svc.exerciseTherapyDesc" },
  "therapeutic-ultrasound": { titleKey: "svc.ultrasound", descKey: "svc.ultrasoundDesc" },
  "sports-injury": { titleKey: "svc.sportsInjury", descKey: "svc.sportsInjuryDesc" },
  "chronic-pain": { titleKey: "svc.chronicPain", descKey: "svc.chronicPainDesc" },
  "pre-post-surgery": { titleKey: "svc.prePostSurgery", descKey: "svc.prePostSurgeryDesc" },
  kinesiotherapy: { titleKey: "svc.kinesiotherapy", descKey: "svc.kinesiotherapyDesc" },
  microcurrent: { titleKey: "svc.microcurrent", descKey: "svc.microcurrentDesc" },
  "mls-laser": { titleKey: "svc.mlsLaser", descKey: "svc.mlsLaserDesc" },
  "biohacking-performance": { titleKey: "svc.biohacking", descKey: "svc.biohackingDesc" },
  "hrv-recovery-monitoring": { titleKey: "svc.hrv", descKey: "svc.hrvDesc" },
  "sleep-longevity-optimisation": { titleKey: "svc.sleep", descKey: "svc.sleepDesc" },
};

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { slug } = params;
  const canonical = `${BASE_URL}/services/${slug}`;

  let title = "";
  let description = "";
  try {
    const dbPage = await (prisma as any).servicePage.findUnique({ where: { slug } });
    if (dbPage?.titleEn?.trim()) title = dbPage.titleEn;
    if (dbPage?.descriptionEn?.trim()) description = dbPage.descriptionEn;
  } catch {
    // DB unavailable — fall through to hardcoded content below
  }

  const fallback = SERVICE_META[slug];
  if (!title && fallback) title = t(fallback.titleKey, "en-GB");
  if (!description && fallback) description = t(fallback.descKey, "en-GB");

  if (!title) {
    return { title: "Service Not Found", robots: { index: false, follow: true } };
  }

  const fullTitle = `${title} | Bruno Physical Rehabilitation`;
  return {
    title: fullTitle,
    description: description || undefined,
    alternates: { canonical },
    openGraph: {
      title: fullTitle,
      description: description || undefined,
      type: "website",
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: description || undefined,
    },
  };
}

export default function ServiceSlugLayout({ children }: { children: React.ReactNode }) {
  return children;
}
