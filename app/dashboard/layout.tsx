import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth-options";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import ImpersonationBanner from "@/components/impersonation-banner";

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // Check if admin is impersonating a patient
  const cookieStore = cookies();
  const isImpersonating = !!cookieStore.get("impersonate-patient-id")?.value;

  // If user is ADMIN, redirect to admin panel — UNLESS they are impersonating a patient
  const userRole = (session.user as { role?: string })?.role;
  if ((userRole === "ADMIN" || userRole === "SUPERADMIN") && !isImpersonating) {
    redirect("/admin");
  }

  return (
    <>
      <ImpersonationBanner />
      <div className={isImpersonating ? "pt-10" : ""}>
        <DashboardLayout>{children}</DashboardLayout>
      </div>
    </>
  );
}
