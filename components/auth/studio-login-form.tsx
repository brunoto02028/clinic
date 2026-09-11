"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Mail, Lock, AlertCircle, Loader2, Eye, EyeOff, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useLocale } from "@/hooks/use-locale";

interface StudioLoginFormProps {
  slug: string;
  clinicId: string;
  studioName: string;
  logoUrl: string | null;
  primaryColor: string | null;
}

export default function StudioLoginForm(props: StudioLoginFormProps) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <StudioLogin {...props} />
    </Suspense>
  );
}

function StudioLogin({ slug, clinicId, studioName, logoUrl, primaryColor }: StudioLoginFormProps) {
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";

  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [denied, setDenied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });

  useEffect(() => { setMounted(true); }, []);

  const accent = primaryColor || "#607d7d";

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
          msg = isPt ? "Conta desativada. Contacte o seu personal." : "Account deactivated. Contact your trainer.";
        } else if (result.error.includes("Can't reach") || result.error.includes("Timed out") || result.error.includes("prisma")) {
          msg = isPt ? "Serviço temporariamente indisponível." : "Service temporarily unavailable.";
        }
        setError(msg);
        setIsLoading(false);
        return;
      }

      // Tenant-scoped: only members of THIS studio sign in here. A user from
      // another tenant (e.g. a clinic patient) is rejected at the door and kept
      // out of this studio. SUPERADMIN is exempt.
      const sessionRes = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json();
      const role = sessionData?.user?.role;
      const userClinicId = sessionData?.user?.clinicId;

      if (role !== "SUPERADMIN" && userClinicId !== clinicId) {
        // This user belongs to another tenant — their session is scoped to their
        // own clinicId, so they can never operate inside this studio regardless.
        // Reject at the door with a clear reason and a way out; no silent bounce.
        setDenied(true);
        setError(
          isPt
            ? `Esta conta não faz parte de ${studioName}.`
            : `This account isn't part of ${studioName}.`
        );
        setFormData({ email: "", password: "" });
        setIsLoading(false);
        return;
      }

      // Role-based landing: trainer/staff → admin; student → dashboard.
      // Only honour a same-origin relative callbackUrl (starts with a single
      // "/") — reject absolute/protocol-relative values to avoid open redirect.
      const rawCallback = searchParams?.get("callbackUrl");
      const safeCallback = rawCallback && /^\/(?!\/)/.test(rawCallback) ? rawCallback : null;
      const dest = safeCallback || (role === "PATIENT" ? "/dashboard" : "/admin");
      window.location.href = dest;
    } catch (err) {
      console.error("Studio login error:", err);
      setError(isPt ? "Erro inesperado. Tente novamente." : "An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="public-site min-h-screen bg-background flex flex-col">
      <main className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-md">
          {/* Studio brand */}
          <div className="flex flex-col items-center gap-3 mb-6">
            {logoUrl ? (
              <Image src={logoUrl} alt={studioName} width={64} height={64} className="h-16 w-auto object-contain" />
            ) : (
              <div
                className="inline-flex items-center justify-center h-14 w-14 rounded-2xl text-white"
                style={{ backgroundColor: accent }}
              >
                <Dumbbell className="h-7 w-7" />
              </div>
            )}
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium"
              style={{ backgroundColor: `${accent}1a`, color: accent }}
            >
              {isPt ? "Portal do Aluno" : "Student Portal"}
            </div>
          </div>

          <Card className="shadow-xl border border-slate-200">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold text-foreground">
                {isPt ? `Entrar em ${studioName}` : `Sign in to ${studioName}`}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {isPt ? "Acesse seus treinos e avaliações" : "Access your workouts and assessments"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex flex-col gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                    {denied && (
                      <Link href="/login" className="self-start font-medium underline" style={{ color: accent }}>
                        {isPt ? "Ir para o login" : "Go to sign in"} →
                      </Link>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">{isPt ? "E-mail" : "Email"}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={isPt ? "seu.email@exemplo.com" : "your.email@example.com"}
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
                    <Link href="/forgot-password" className="text-sm font-medium hover:underline" style={{ color: accent }}>
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

                <Button type="submit" className="w-full text-white" size="lg" disabled={isLoading} style={{ backgroundColor: accent }}>
                  {isLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />{isPt ? "Entrando..." : "Signing in..."}</>
                  ) : (
                    isPt ? "Entrar" : "Sign In"
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-4 border-t text-center">
                <p className="text-sm text-muted-foreground">
                  {isPt ? "Novo por aqui? " : "New here? "}
                  <Link href={`/join/${slug}`} className="font-medium hover:underline" style={{ color: accent }}>
                    {isPt ? "Crie sua conta" : "Create your account"}
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {studioName} · {isPt ? "Powered by BPR" : "Powered by BPR"}
          </p>
        </div>
      </main>
    </div>
  );
}
