import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import SimplifiedSignupForm from "@/components/auth/simplified-signup-form";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getSiteSettingsLogo } from "@/lib/get-site-settings";
import type { Metadata } from "next";

// Utility page — keep out of the index so crawl budget goes to content (P4.1)
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default async function SignupPage() {
  const [session, settings] = await Promise.all([
    getServerSession(authOptions),
    getSiteSettingsLogo(),
  ]);

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="public-site min-h-screen bg-background flex flex-col">
      <SiteHeader currentPage="other" initialSettings={settings} />
      <main className="flex-1 flex items-center justify-center p-4 py-8">
        <SimplifiedSignupForm />
      </main>
      <SiteFooter />
    </div>
  );
}
