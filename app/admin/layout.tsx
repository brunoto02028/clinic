import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import AdminMiniSidebar from "@/components/admin/admin-mini-sidebar";
import SectionTabs from "@/components/admin/section-tabs";

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
      <main className="admin-content-area py-6 pr-4 sm:pr-6 lg:pr-8 pb-8">
        {/* Mobile spacer for hamburger button */}
        <div className="h-14 lg:hidden" />
        <SectionTabs />
        {children}
      </main>
    </div>
  );
}
