import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import { DynamicFavicon } from "@/components/dynamic-favicon";
import { WhatsAppFloatingButton } from "@/components/whatsapp-button";
import { Suspense } from "react";
import { SiteTracker } from "@/components/analytics/site-tracker";
import { CookieConsentBanner } from "@/components/cookie-consent";
import { prisma } from "@/lib/db";
import { SchemaOrgScript } from "@/components/schema-org-script";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0f1e",
};

// Dynamic metadata — reads SEO fields from Site Settings in DB
export async function generateMetadata(): Promise<Metadata> {
  const FALLBACK_TITLE = "BPR";
  const FALLBACK_DESC = "Professional physiotherapy and rehabilitation services.";
  const BASE_URL = "https://bpr.rehab";

  let s: any = null;
  try {
    s = await prisma.siteSettings.findFirst();
  } catch {
    // DB unavailable — use fallbacks
  }

  const title = s?.metaTitle || FALLBACK_TITLE;
  const description = s?.metaDescription || FALLBACK_DESC;
  const keywords = s?.metaKeywords || undefined;
  const siteName = s?.ogSiteName || s?.siteName || "BPR";
  const ogImage = s?.ogImageUrl
    ? (s.ogImageUrl.startsWith("http") ? s.ogImageUrl : `${BASE_URL}${s.ogImageUrl}`)
    : `${BASE_URL}/og-image.png`;
  const canonical = s?.canonicalUrl || BASE_URL;
  const ogType = (s?.ogType as any) || "website";
  const ogLocale = s?.ogLocale || "en_GB";
  const twitterCard = (s?.twitterCard as any) || "summary_large_image";

  return {
    title,
    description,
    keywords: keywords || undefined,
    authors: [{ name: siteName }],
    creator: siteName,
    publisher: siteName,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      type: ogType,
      locale: ogLocale,
      url: canonical,
      title,
      description,
      siteName,
      images: [{ url: ogImage, width: 1200, height: 630, alt: siteName }],
    },
    twitter: {
      card: twitterCard,
      title,
      description,
      images: [ogImage],
      ...(s?.twitterSite ? { site: s.twitterSite } : {}),
      ...(s?.twitterCreator ? { creator: s.twitterCreator } : {}),
    },
    alternates: { canonical },
    metadataBase: new URL(BASE_URL),
    ...(s?.googleVerification ? { verification: { google: s.googleVerification } } : {}),
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB">
      <body className={inter.className}>
        <Suspense fallback={null}>
          <SchemaOrgScript />
        </Suspense>
        <Providers>
          <DynamicFavicon />
          {children}
          <WhatsAppFloatingButton />
          <Toaster />
          <Suspense fallback={null}>
            <SiteTracker />
          </Suspense>
          <CookieConsentBanner />
        </Providers>
      </body>
    </html>
  );
}
