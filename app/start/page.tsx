import { Metadata } from "next";
import { getStartPageSettings } from "@/lib/get-site-settings";
import { StartLanding } from "@/components/start/start-landing";

const BASE_URL = "https://bpr.rehab";
const TITLE = "Start Your Recovery — Bruno Physical Rehabilitation";
const DESCRIPTION =
  "Free first consultation for new patients in Ipswich, Suffolk. Discover the real cause of your pain — not just where it hurts. Healing With Heart.";

function absoluteUrl(url?: string | null): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `${BASE_URL}${url}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getStartPageSettings();
  // Prefer the real BPR logo over the generic site-wide OG fallback image
  const ogImage = absoluteUrl(settings?.logoUrl) || `${BASE_URL}/og-image.png`;

  return {
    title: TITLE,
    description: DESCRIPTION,
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      title: TITLE,
      description: DESCRIPTION,
      url: `${BASE_URL}/start`,
      siteName: "Bruno Physical Rehabilitation",
      images: [{ url: ogImage, alt: "Bruno Physical Rehabilitation" }],
    },
    twitter: {
      card: "summary_large_image",
      title: TITLE,
      description: DESCRIPTION,
      images: [ogImage],
    },
  };
}

export default async function StartPage() {
  const settings = await getStartPageSettings();

  return <StartLanding settings={settings} />;
}
