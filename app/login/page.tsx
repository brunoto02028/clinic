import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import LoginForm from "@/components/auth/login-form";
import { AuthPageHeader } from "@/components/auth/auth-page-header";
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
        <div className="public-site min-h-screen bg-background flex flex-col">
          <AuthPageHeader settings={settings} />
          <main className="flex-1 flex items-center justify-center p-4 pb-12">
            <LoginForm />
          </main>
          <footer className="p-4 text-center">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Bruno Physical Rehabilitation
            </p>
          </footer>
        </div>
      }
    >
      <LoginForm />
    </NativeLoginShell>
  );
}
