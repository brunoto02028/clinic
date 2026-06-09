import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import LoginForm from "@/components/auth/login-form";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { NativeLoginShell } from "@/components/auth/native-login-shell";
import { getSiteSettingsLogo } from "@/lib/get-site-settings";

export default async function LoginPage() {
  const [session, settings] = await Promise.all([
    getServerSession(authOptions),
    getSiteSettingsLogo(),
  ]);

  if (session?.user) {
    const userRole = (session.user as any)?.role;
    if (userRole === "ADMIN" || userRole === "THERAPIST" || userRole === "SUPERADMIN") {
      redirect("/admin");
    } else {
      redirect("/dashboard");
    }
  }

  return (
    <NativeLoginShell
      webShell={
        <div className="min-h-screen bg-background bg-grid-pattern flex flex-col">
          <SiteHeader currentPage="other" initialSettings={settings} />
          <main className="flex-1 flex items-center justify-center p-4 py-8">
            <LoginForm />
          </main>
          <SiteFooter />
        </div>
      }
    >
      <LoginForm />
    </NativeLoginShell>
  );
}
