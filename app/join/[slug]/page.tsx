import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import SimplifiedSignupForm from "@/components/auth/simplified-signup-form";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getSiteSettingsLogo } from "@/lib/get-site-settings";
import { resolveJoinTenant } from "@/lib/join-tenant";
import type { Metadata } from "next";

// Branded entry point for a tenant (studio/clinic). Utility page — keep out of
// the index so crawl budget goes to content.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default async function JoinPage({ params }: { params: { slug: string } }) {
  const tenant = await resolveJoinTenant(params.slug);
  if (!tenant) {
    notFound();
  }

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
        <SimplifiedSignupForm tenantSlug={tenant.slug} tenantName={tenant.name} />
      </main>
      <SiteFooter />
    </div>
  );
}
