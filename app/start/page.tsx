import { Metadata } from "next";
import { getSiteSettingsLogo } from "@/lib/get-site-settings";
import { StartLanding } from "@/components/start/start-landing";

export const metadata: Metadata = {
  title: "Start Your Recovery — Bruno Physical Rehabilitation",
  description:
    "Free first consultation for new patients in Ipswich, Suffolk. Discover the real cause of your pain — not just where it hurts. Healing With Heart.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Start Your Recovery — Bruno Physical Rehabilitation",
    description:
      "Free first consultation for new patients in Ipswich, Suffolk. Discover the real cause of your pain — not just where it hurts.",
    url: "https://bpr.rehab/start",
    siteName: "Bruno Physical Rehabilitation",
  },
};

export default async function StartPage() {
  const logoSettings = await getSiteSettingsLogo();

  return <StartLanding logoSettings={logoSettings} />;
}
