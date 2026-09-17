import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import AdminMiniSidebar from "@/components/admin/admin-mini-sidebar";
import AdminHeader from "@/components/admin/admin-header";
import SectionTabs from "@/components/admin/section-tabs";
import type { Metadata, Viewport } from "next";

// Staff portal — private, keep out of the index (P4.1).
// Title reflects the tenant (studio/clinic) name so a personal trainer doesn't
// see the base clinic's name in the browser tab.
export async function generateMetadata(): Promise<Metadata> {
  const session = await getServerSession(authOptions);
  const clinicName = (session?.user as any)?.clinicName;
  return {
    title: { absolute: clinicName ? `${clinicName} · Admin` : "Admin" },
    robots: { index: false, follow: true },
  };
}

// Overrides the root layout's maximumScale: 5 (unlocked so patients aren't
// trapped zoomed-in on a small input — see app/layout.tsx and the
// .patient-content-area/.patient-form-area/.public-site rules in
// globals.css). Admin's compact grids (protocol items, exercise
// prescriptions) were the whole reason that CSS fix stayed scoped away from
// /admin in the first place; an unscoped viewport-level zoom unlock would
// have undercut that by letting a pinch/double-tap zoom the same tight
// layout anyway. Back to the original locked behaviour here.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const userRole = (session.user as any)?.role;
  if (!userRole || userRole === "PATIENT") {
    redirect("/dashboard");
  }

  const user = {
    firstName: (session.user as any)?.firstName || session.user?.name?.split(" ")[0],
    lastName: (session.user as any)?.lastName || session.user?.name?.split(" ").slice(1).join(" "),
    email: session.user?.email,
    role: userRole,
    clinicId: (session.user as any)?.clinicId,
    clinicName: (session.user as any)?.clinicName,
    permissions: (session.user as any)?.permissions,
  };

  return (
    <div className="min-h-screen bg-background bg-grid-pattern">
      <AdminMiniSidebar user={user} />
      <main className="admin-content-area">
        {/* Mobile spacer for hamburger button */}
        <div className="h-14 lg:hidden" />
        <AdminHeader user={user} />
        <SectionTabs />
        <div className="admin-page-content">
          {children}
        </div>
      </main>
    </div>
  );
}
