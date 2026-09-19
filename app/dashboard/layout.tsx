import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import ImpersonationBanner from "@/components/impersonation-banner";
import type { Metadata } from "next";

// Patient portal — private, keep out of the index (P4.1)
export async function generateMetadata(): Promise<Metadata> {
  // A studio's students see their studio in the browser tab, not BPR
  // (activity 55, T-5). Clinic patients keep the site title.
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  return {
    ...(user?.clinicType === "PERSONAL_TRAINER" && user?.clinicName ? { title: { absolute: user.clinicName, template: `%s · ${user.clinicName}` } } : {}),
    robots: { index: false, follow: true },
  };
}

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // Impersonation only counts when the logged-in user is actually staff — the
  // same gate middleware applies before it will swap identities. Without the
  // role check a patient whose stale cookie outlived their admin's session was
  // shown the "Visualizando como…" banner on their own account.
  const cookieStore = cookies();
  const userRole = (session.user as { role?: string })?.role;
  const isStaff = userRole === "ADMIN" || userRole === "SUPERADMIN";
  const isImpersonating = isStaff && !!cookieStore.get("impersonate-patient-id")?.value;
  const impersonatedName = isImpersonating
    ? cookieStore.get("impersonate-patient-name")?.value || ""
    : "";

  // If user is ADMIN, redirect to admin panel — UNLESS they are impersonating a patient
  if (isStaff && !isImpersonating) {
    redirect("/admin");
  }

  // Seeds the client-side UI language from the patient's own preferredLocale
  // (staff-set, e.g. app/admin/patients/[id]/page.tsx's EN/PT toggle) the
  // very first time they land here — lib/i18n.ts's getLocale() otherwise
  // always starts at "en-GB" until someone manually taps the sidebar's
  // EN/PT switch, which a patient who doesn't read English may never find.
  // Only when impersonating: the impersonated PATIENT's locale, not the
  // staff member's own account. Never overwrites an existing choice — this
  // only fires once, before that localStorage key exists at all.
  const localeOwnerId = isImpersonating
    ? cookieStore.get("impersonate-patient-id")?.value
    : (session.user as any).id;
  const localeOwner = localeOwnerId
    ? await prisma.user.findUnique({ where: { id: localeOwnerId }, select: { preferredLocale: true } })
    : null;
  const seedLocale = localeOwner?.preferredLocale === "pt-BR" ? "pt-BR" : null;

  return (
    <>
      {isImpersonating && <ImpersonationBanner patientName={impersonatedName} />}
      {seedLocale && (
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(!localStorage.getItem("clinic-locale")){localStorage.setItem("clinic-locale","${seedLocale}");}}catch(e){}`,
          }}
        />
      )}
      <div className={isImpersonating ? "pt-10" : ""}>
        <Suspense fallback={null}>
          <DashboardLayout>{children}</DashboardLayout>
        </Suspense>
      </div>
    </>
  );
}
