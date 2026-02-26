"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, AlertCircle, Loader2, Eye, EyeOff, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { useLocale } from "@/hooks/use-locale";

export default function StaffLoginPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <StaffLoginPage />
    </Suspense>
  );
}

function StaffLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, toggleLocale, t: T } = useLocale();
  const isPt = locale === "pt-BR";

  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [formData, setFormData] = useState({ email: "", password: "" });

  useEffect(() => {
    setMounted(true);
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setSettings(d))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        let msg = isPt ? "Email ou senha inválidos" : "Invalid email or password";
        if (result.error.includes("deactivated")) {
          msg = isPt ? "Conta desativada. Contacte o administrador." : "Account deactivated. Contact your administrator.";
        } else if (result.error.includes("Can't reach") || result.error.includes("Timed out") || result.error.includes("prisma")) {
          msg = isPt ? "Serviço temporariamente indisponível." : "Service temporarily unavailable.";
        }
        setError(msg);
      } else {
        // Check role — only allow staff
        const sessionRes = await fetch("/api/auth/session");
        const sessionData = await sessionRes.json();
        const userRole = sessionData?.user?.role;

        if (userRole === "PATIENT") {
          // Sign out and show error
          await signIn("credentials", { redirect: false }); // This won't actually sign in again
          setError(
            isPt
              ? "Esta área é exclusiva para a equipe. Use o Portal do Paciente para acessar sua conta."
              : "This area is for staff only. Please use the Patient Portal to access your account."
          );
          // Sign the patient out
          await fetch("/api/auth/signout", { method: "POST" }).catch(() => {});
          window.location.href = "/api/auth/signout?callbackUrl=/login";
          return;
        }

        // Staff/Admin — redirect to admin panel
        const explicitCallback = searchParams?.get("callbackUrl");
        window.location.href = explicitCallback || "/admin";
      }
    } catch (err) {
      console.error("Staff login error:", err);
      setError(isPt ? "Erro inesperado. Tente novamente." : "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background bg-grid-pattern flex flex-col">
      {/* Minimal header with logo + locale toggle */}
      <header className="p-4 sm:p-6 flex items-center justify-between max-w-7xl mx-auto w-full">
        <Logo
          logoUrl={settings?.screenLogos?.landingHeader?.logoUrl || settings?.logoUrl}
          darkLogoUrl={settings?.screenLogos?.landingHeader?.darkLogoUrl || settings?.darkLogoUrl}
          size="md"
          linkTo="/"
          variant="dark"
        />
        <div className="flex items-center gap-0.5 bg-white/10 rounded-md p-0.5">
          <button
            onClick={() => { if (locale !== "en-GB") toggleLocale(); }}
            className={`text-[10px] font-medium px-2 py-1 rounded transition-colors ${locale === "en-GB" ? "bg-white/20 text-white" : "text-white/60 hover:text-white"}`}
          >EN</button>
          <button
            onClick={() => { if (locale !== "pt-BR") toggleLocale(); }}
            className={`text-[10px] font-medium px-2 py-1 rounded transition-colors ${locale === "pt-BR" ? "bg-white/20 text-white" : "text-white/60 hover:text-white"}`}
          >PT</button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-4 pb-12">
        <div className="w-full max-w-md">
          {/* Staff badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 backdrop-blur-sm border border-primary/20 animate-neon-pulse">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-white/90">
                {isPt ? "Portal da Equipe" : "Staff Portal"}
              </span>
            </div>
          </div>

          <Card className="shadow-2xl neon-glow-cyan">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold text-foreground">
                {isPt ? "Acesso da Equipe" : "Staff Access"}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {isPt ? "Entre com suas credenciais de funcionário" : "Sign in with your staff credentials"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">{isPt ? "E-mail" : "Email"}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={isPt ? "seu.email@clinica.com" : "your.email@clinic.com"}
                      className="pl-10"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">{isPt ? "Senha" : "Password"}</Label>
                    <Link
                      href="/forgot-password"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {isPt ? "Esqueceu a senha?" : "Forgot password?"}
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {isPt ? "Entrando..." : "Signing in..."}
                    </>
                  ) : (
                    isPt ? "Entrar" : "Sign In"
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-4 border-t border-white/5 text-center">
                <p className="text-xs text-muted-foreground">
                  {isPt
                    ? "Contas de equipe são criadas pelo administrador."
                    : "Staff accounts are created by your administrator."}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Patient portal link */}
          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              {isPt ? "Paciente? Acesse o Portal do Paciente" : "Patient? Access the Patient Portal"} →
            </Link>
          </div>
        </div>
      </main>

      {/* Minimal footer */}
      <footer className="p-4 text-center">
        <p className="text-xs text-white/40">
          © {new Date().getFullYear()} Bruno Physical Rehabilitation
        </p>
      </footer>
    </div>
  );
}
