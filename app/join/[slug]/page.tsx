import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import SimplifiedSignupForm from "@/components/auth/simplified-signup-form";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getSiteSettingsLogo } from "@/lib/get-site-settings";
import { resolveJoinTenant } from "@/lib/join-tenant";
import { prisma } from "@/lib/db";
import type { Metadata } from "next";

// Branded entry point for a tenant (studio/clinic). Utility page — keep out of
// the index so crawl budget goes to content.
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  // A studio's sign-up shows the studio in the browser tab (activity 55, T-5).
  const tenant = await resolveJoinTenant(params.slug);
  return {
    ...(tenant?.type === "PERSONAL_TRAINER" ? { title: { absolute: tenant.name } } : {}),
    robots: { index: false, follow: true },
  };
}

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

  // A personal-trainer studio gets student/studio wording and links its sign-in
  // to the branded /studio/[slug] rather than the generic /login.
  const isPersonal = tenant.type === "PERSONAL_TRAINER";
  const branding = isPersonal
    ? await prisma.clinic.findUnique({ where: { id: tenant.clinicId }, select: { primaryColor: true, logoUrl: true } })
    : null;

  // A studio's sign-up carries the studio's brand only — not BPR's site menu
  // and footer (activity 55, T-5).
  return (
    <div className="public-site min-h-screen bg-background flex flex-col">
      {!isPersonal && <SiteHeader currentPage="other" initialSettings={settings} />}
      <main className="flex-1 flex items-center justify-center p-4 py-8">
        <SimplifiedSignupForm
          tenantSlug={tenant.slug}
          tenantName={tenant.name}
          isPersonal={isPersonal}
          primaryColor={branding?.primaryColor ?? null}
          logoUrl={branding?.logoUrl ?? null}
        />
      </main>
      {isPersonal ? (
        <p className="pb-6 text-center text-xs text-muted-foreground">{tenant.name} · Powered by BPR</p>
      ) : (
        <SiteFooter />
      )}
    </div>
  );
}
