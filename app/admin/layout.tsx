import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const userRole = (session.user as { role?: string })?.role;
  if (userRole !== "ADMIN" && userRole !== "THERAPIST" && userRole !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar user={session.user as { firstName?: string; lastName?: string; email?: string; role?: string; permissions?: Record<string, boolean> }} />
      <div className="lg:pl-72">
        <main className="py-6 px-4 sm:px-6 lg:px-8 pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
