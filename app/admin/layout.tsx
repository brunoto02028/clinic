import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import AdminMiniSidebar from "@/components/admin/admin-mini-sidebar";
import AdminHeader from "@/components/admin/admin-header";
import SectionTabs from "@/components/admin/section-tabs";
import type { Metadata } from "next";

// Staff portal — private, keep out of the index (P4.1)
export const metadata: Metadata = {
  robots: { index: false, follow: true },
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
