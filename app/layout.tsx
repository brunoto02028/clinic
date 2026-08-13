import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter, Sora, Lora } from "next/font/google";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import { DynamicFavicon } from "@/components/dynamic-favicon";
import { WhatsAppFloatingButton } from "@/components/whatsapp-button";
import { Suspense } from "react";
import { SiteTracker } from "@/components/analytics/site-tracker";
import { CookieConsentBanner } from "@/components/cookie-consent";
import { VersionChecker } from "@/components/version-checker";
import { WebVitals } from "@/components/web-vitals";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { Hotjar } from "@/components/analytics/hotjar";
import { prisma } from "@/lib/db";
import { SchemaOrgScript } from "@/components/schema-org-script";
import { MobileInit } from "@/components/mobile-init";

export const dynamic = 'force-dynamic';

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  variable: '--font-inter',
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Arial', 'sans-serif'],
  adjustFontFallback: true,
});

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: 'swap',
  preload: false,
  variable: '--font-sora',
});

// Serif reading font — used only for the Beyond Pain book chapter reader
// (.book-content, see app/globals.css) to give it a proper "book" feel.
const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: 'swap',
  preload: false,
  variable: '--font-lora',
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
  const FALLBACK_TITLE = "BPR — Physical Rehabilitation | Ipswich, Suffolk";
  const FALLBACK_DESC = "Integrated physical rehabilitation programme in Ipswich, Suffolk. Combining MLS Laser, Biomechanical Analysis, HRV Monitoring and Advanced Electrotherapy into one complete, outcome-focused treatment plan.";
  const BASE_URL = process.env.NEXTAUTH_URL || "https://bpr.clinic";

  let s: any = null;
  try {
    s = await prisma.siteSettings.findFirst();
  } catch {
    // DB unavailable — use fallbacks
  }

  const title = s?.metaTitle || FALLBACK_TITLE;
  const description = s?.metaDescription || FALLBACK_DESC;
  const FALLBACK_KEYWORDS = "physical rehabilitation Ipswich, sports rehabilitation Suffolk, integrated rehabilitation programme, MLS laser therapy Ipswich, biomechanical assessment Suffolk, sports injury rehabilitation, pain elimination programme, movement restoration Ipswich, physical rehabilitation specialist Suffolk, Bruno Physical Rehabilitation";
  const keywords = s?.metaKeywords || FALLBACK_KEYWORDS;
  const siteName = s?.ogSiteName || s?.siteName || "BPR";
  const ogImage = s?.ogImageUrl
    ? (s.ogImageUrl.startsWith("http") ? s.ogImageUrl : `${BASE_URL}${s.ogImageUrl}`)
    : s?.logoUrl
      ? (s.logoUrl.startsWith("http") ? s.logoUrl : `${BASE_URL}${s.logoUrl}`)
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
              overflow-x: hidden;
            }
            html { overflow-x: hidden; }
            .hero { min-height: 100vh; }
            img { max-width: 100%; height: auto; }
          `
        }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://bpr.clinic" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.className} ${sora.variable} ${lora.variable}`} suppressHydrationWarning>
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
          <MobileInit />
          <WebVitals />
          <GoogleAnalytics />
          <Hotjar />
        </Providers>
      </body>
    </html>
  );
}
