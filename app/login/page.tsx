import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import LoginForm from "@/components/auth/login-form";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    const userRole = (session.user as any)?.role;
    if (userRole === "ADMIN" || userRole === "THERAPIST" || userRole === "SUPERADMIN") {
      redirect("/admin");
    } else {
      redirect("/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader currentPage="other" />
      <main className="flex-1 flex items-center justify-center p-4 py-8">
        <LoginForm />
      </main>
      <SiteFooter />
    </div>
  );
}
