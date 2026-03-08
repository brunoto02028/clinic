"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, AlertCircle, Loader2, Eye, EyeOff, CheckCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useLocale } from "@/hooks/use-locale";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const justVerified = searchParams?.get("verified") === "true";
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    setMounted(true);
    // Restore saved email if "remember me" was used
    try {
      const saved = localStorage.getItem("clinic-remember");
      if (saved) {
        const { email } = JSON.parse(saved);
        if (email) {
          setFormData(prev => ({ ...prev, email }));
          setRememberMe(true);
        }
      }
    } catch {}
  }, []);

  const callbackUrl = searchParams?.get("callbackUrl") || "/dashboard";

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
        if (result.error === "CredentialsSignin") {
          msg = isPt ? "Email ou senha inválidos. Tente novamente." : "Invalid email or password. Please try again.";
        } else if (result.error.includes("deactivated")) {
          msg = isPt ? "Conta desativada. Verifique seu email ou contacte o suporte." : "Account is deactivated. Please verify your email or contact support.";
        } else if (result.error.includes("Can't reach") || result.error.includes("Timed out") || result.error.includes("prisma")) {
          msg = isPt ? "Serviço temporariamente indisponível." : "Service temporarily unavailable. Please try again in a moment.";
        }
        setError(msg);
      } else {
        if (rememberMe) {
          localStorage.setItem("clinic-remember", JSON.stringify({ email: formData.email }));
        } else {
          localStorage.removeItem("clinic-remember");
        }
        // Check role — redirect staff to staff-login
        const sessionRes = await fetch("/api/auth/session");
        const sessionData = await sessionRes.json();
        const userRole = sessionData?.user?.role;

        if (userRole === "ADMIN" || userRole === "THERAPIST" || userRole === "SUPERADMIN") {
          // Staff logged in via patient portal — redirect them to admin
          window.location.href = "/admin";
        } else {
          const explicitCallback = searchParams?.get("callbackUrl");
          window.location.href = explicitCallback || "/dashboard";
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(isPt ? "Erro inesperado. Tente novamente." : "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">
              {isPt ? "Portal do Paciente" : "Patient Portal"}
            </CardTitle>
            <CardDescription>
              {isPt ? "Entre na sua conta" : "Sign in to your account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {justVerified && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                <span>{isPt ? "Conta verificada com sucesso! Faça login." : "Account verified successfully! Please sign in."}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">{isPt ? "E-mail" : "Email Address"}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    className="pl-10"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{isPt ? "Senha" : "Password"}</Label>
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-primary hover:underline hover:text-primary/80 transition-colors"
                  >
                    {isPt ? "Esqueceu a senha?" : "Forgot password?"}
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                />
                <Label htmlFor="remember" className="text-sm font-normal text-slate-600 cursor-pointer">
                  {isPt ? "Lembrar-me" : "Remember me"}
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isPt ? "Entrando..." : "Signing in..."}
                  </>
                ) : (
                  isPt ? "Entrar" : "Sign In"
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-slate-500">{isPt ? "ou" : "or"}</span>
              </div>
            </div>

            {/* Google Sign-In */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              size="lg"
              disabled={isGoogleLoading || isLoading}
              onClick={async () => {
                setIsGoogleLoading(true);
                setError("");
                try {
                  await signIn("google", { callbackUrl: "/dashboard" });
                } catch {
                  setError(isPt ? "Erro ao conectar com Google." : "Failed to connect with Google.");
                  setIsGoogleLoading(false);
                }
              }}
            >
              {isGoogleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              {isPt ? "Entrar com Google" : "Sign in with Google"}
            </Button>

            <div className="mt-6 text-center text-sm">
              <span className="text-slate-600">{isPt ? "Não tem conta? " : "Don't have an account? "}</span>
              <Link href="/signup" className="text-primary font-medium hover:underline">
                {isPt ? "Criar conta" : "Create account"}
              </Link>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 text-center">
              <Link href="/staff-login" className="text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1">
                <Shield className="h-3 w-3" />
                {isPt ? "Equipe? Acesse o Portal da Equipe" : "Staff? Access the Staff Portal"}
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-slate-500">
          {isPt ? "Ao entrar, você concorda com nossos termos de serviço." : "By signing in, you agree to our professional terms of service."}
        </p>
    </div>
  );
}
