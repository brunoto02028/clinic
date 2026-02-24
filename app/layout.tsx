import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import { DynamicFavicon } from "@/components/dynamic-favicon";
import { WhatsAppFloatingButton } from "@/components/whatsapp-button";

const inter = Inter({ subsets: ["latin"] });

// Static metadata to avoid SSR loops and database connection issues
export const metadata: Metadata = {
  title: "Bruno Physical Rehabilitation - Professional Physiotherapy in Richmond",
  description: "Professional physiotherapy and sports rehabilitation services in Richmond, London. Expert treatment for injuries, chronic pain, and optimal physical performance.",
  keywords: "physiotherapy, sports rehabilitation, Richmond, London, physical therapy, injury treatment, pain management",
  authors: [{ name: "Bruno Physical Rehabilitation" }],
  creator: "Bruno Physical Rehabilitation",
  publisher: "Bruno Physical Rehabilitation",
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
    type: "website",
    locale: "en_GB",
    url: "https://bpr.rehab",
    title: "Bruno Physical Rehabilitation - Professional Physiotherapy in Richmond",
    description: "Professional physiotherapy and sports rehabilitation services in Richmond, London. Expert treatment for injuries, chronic pain, and optimal physical performance.",
    siteName: "Bruno Physical Rehabilitation",
    images: [
      {
        url: "https://bpr.rehab/og-image.png",
        width: 1200,
        height: 630,
        alt: "Bruno Physical Rehabilitation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bruno Physical Rehabilitation - Professional Physiotherapy in Richmond",
    description: "Professional physiotherapy and sports rehabilitation services in Richmond, London. Expert treatment for injuries, chronic pain, and optimal physical performance.",
    images: ["https://bpr.rehab/og-image.png"],
  },
  alternates: {
    canonical: "https://bpr.rehab",
  },
  metadataBase: new URL("https://bpr.rehab"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB">
      <body className={inter.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "MedicalBusiness",
              "name": "Bruno Physical Rehabilitation",
              "image": "https://bpr.rehab/og-image.png",
              "@id": "https://bpr.rehab",
              "url": "https://bpr.rehab",
              "telephone": "+44 7XXX XXXXXX",
              "address": {
                "@type": "PostalAddress",
                "streetAddress": "Richmond",
                "addressLocality": "London",
                "postalCode": "TW10",
                "addressCountry": "GB"
              },
              "geo": {
                "@type": "GeoCoordinates",
                "latitude": 51.4613,
                "longitude": -0.3037
              },
              "openingHoursSpecification": [
                {
                  "@type": "OpeningHoursSpecification",
                  "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                  "opens": "09:00",
                  "closes": "18:00"
                }
              ],
              "sameAs": [],
              "medicalSpecialty": "Physiotherapy",
              "priceRange": "££"
            }),
          }}
        />
        <Providers>
          <DynamicFavicon />
          {children}
          <WhatsAppFloatingButton />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
