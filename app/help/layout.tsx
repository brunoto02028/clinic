import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Help Centre | Bruno Physical Rehabilitation",
  description: "Answers to common questions about appointments, the patient portal, treatment programmes and billing at Bruno Physical Rehabilitation.",
  alternates: { canonical: "https://bpr.rehab/help" },
};

export default async function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let settings = null;
  try {
    settings = await prisma.siteSettings.findFirst();
  } catch (error) {
    console.error("Failed to fetch settings:", error);
  }

  return (
    <div className="public-site min-h-screen bg-background flex flex-col">
      <SiteHeader
        initialSettings={settings ? JSON.parse(JSON.stringify(settings)) : null}
      />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
