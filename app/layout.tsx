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
import { VersionChecker } from "@/components/version-checker";
import { WebVitals } from "@/components/web-vitals";
import { prisma } from "@/lib/db";
import { SchemaOrgScript } from "@/components/schema-org-script";

export const dynamic = 'force-dynamic';

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  variable: '--font-inter',
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Arial', 'sans-serif'],
  adjustFontFallback: true,
});

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
    appleWebApp: {
      capable: true,
      title: "BPR",
      statusBarStyle: "black-translucent",
    },
    applicationName: "BPR",
    ...(s?.googleVerification ? { verification: { google: s.googleVerification } } : {}),
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Critical CSS - Above the fold */
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              line-height: 1.5;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            .hero { min-height: 100vh; }
            img { max-width: 100%; height: auto; }
          `
        }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://bpr.rehab" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
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
          <VersionChecker />
          <WebVitals />
        </Providers>
      </body>
    </html>
  );
}
