"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useLocale } from "@/hooks/use-locale";
import {
  Mail,
  Lock,
  User,
  Phone,
  AlertCircle,
  Loader2,
  CheckCircle,
  ExternalLink,
  Shield,
  Globe,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function SignupForm() {
  const router = useRouter();
  const { locale, setLocale } = useLocale();
  const isPt = locale === "pt-BR";
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState(locale);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!termsAccepted) {
      setError(isPt ? "Você deve aceitar os Termos de Uso antes de criar sua conta." : "You must accept the Terms of Use before creating your account.");
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(isPt ? "As senhas não coincidem" : "Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError(isPt ? "A senha deve ter pelo menos 8 caracteres" : "Password must be at least 8 characters long");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          role: "PATIENT",
          preferredLocale: selectedLocale,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Registration failed");
      }

      // Redirect to verification page (account is inactive until verified)
      const userId = data.user?.id;
      const userEmail = encodeURIComponent(formData.email);
      router.replace(`/verify?userId=${userId}&email=${userEmail}`);
    } catch (err: any) {
      console.error("Signup error:", err);
      setError(err?.message || (isPt ? "Ocorreu um erro inesperado. Tente novamente." : "An unexpected error occurred. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">
              {isPt ? "Criar Conta" : "Create Account"}
            </CardTitle>
            <CardDescription>
              {isPt ? "Registre-se para agendar consultas e gerenciar seu atendimento" : "Register to book appointments and manage your care"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Language Selector */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  {isPt ? "Idioma do Portal" : "Portal Language"}
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setSelectedLocale("en-GB"); setLocale("en-GB"); }}
                    className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                      selectedLocale === "en-GB"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-white/10 text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <span className="text-base">🇬🇧</span>
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectedLocale("pt-BR"); setLocale("pt-BR"); }}
                    className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                      selectedLocale === "pt-BR"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-white/10 text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <span className="text-base">🇧🇷</span>
                    Português
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{isPt ? "Nome" : "First Name"}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="firstName"
                      type="text"
                      placeholder={isPt ? "João" : "John"}
                      className="pl-10"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">{isPt ? "Sobrenome" : "Last Name"}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="lastName"
                      type="text"
                      placeholder={isPt ? "Silva" : "Smith"}
                      className="pl-10"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
              </div>

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
                <Label htmlFor="phone">{isPt ? "Telefone (Opcional)" : "Phone Number (Optional)"}</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder={isPt ? "(11) 99999-0000" : "+44 7700 900000"}
                    className="pl-10"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{isPt ? "Senha" : "Password"}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                  />
                </div>
                <p className="text-xs text-slate-500">{isPt ? "Mínimo 8 caracteres" : "Minimum 8 characters"}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{isPt ? "Confirmar Senha" : "Confirm Password"}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmPassword: e.target.value })
                    }
                    required
                  />
                </div>
                {formData.password && formData.confirmPassword && formData.password === formData.confirmPassword && (
                  <div className="flex items-center gap-1 text-emerald-600 text-xs">
                    <CheckCircle className="h-3 w-3" />
                    <span>{isPt ? "Senhas coincidem" : "Passwords match"}</span>
                  </div>
                )}
              </div>

              {/* Terms of Use */}
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>{isPt ? "Termos de Uso e Consentimento" : "Terms of Use & Consent"}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isPt
                    ? "Leia nossos Termos de Uso antes de criar sua conta. Abre em nova aba — volte aqui após a leitura."
                    : "Please read our Terms of Use before creating your account. Opens in a new tab — return here after reading."}
                </p>
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {isPt ? "Ler Termos de Uso e Política de Privacidade" : "Read Terms of Use & Privacy Policy"}
                </a>
                <div className="flex items-start gap-3 pt-1">
                  <Checkbox
                    id="terms-checkbox"
                    checked={termsAccepted}
                    onCheckedChange={(c) => setTermsAccepted(c === true)}
                  />
                  <Label htmlFor="terms-checkbox" className="font-normal cursor-pointer text-xs leading-relaxed text-slate-700">
                    {isPt
                      ? "Li e aceito os Termos de Uso e Política de Privacidade, e consinto com o processamento dos meus dados de saúde para fins clínicos de acordo com o GDPR do Reino Unido."
                      : "I have read and accept the Terms of Use & Privacy Policy, and consent to the processing of my health data for clinical purposes in accordance with UK GDPR."}
                  </Label>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading || !termsAccepted}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isPt ? "Criando conta..." : "Creating account..."}
                  </>
                ) : (
                  isPt ? "Criar Conta" : "Create Account"
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

            {/* Google Sign-Up */}
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
              {isPt ? "Cadastrar com Google" : "Sign up with Google"}
            </Button>

            <div className="mt-6 text-center text-sm">
              <span className="text-slate-600">{isPt ? "Já tem conta? " : "Already have an account? "}</span>
              <Link href="/login" className="text-primary font-medium hover:underline">
                {isPt ? "Entrar" : "Sign in"}
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-slate-500">
          {isPt ? "Seus dados são protegidos de acordo com as regulamentações GDPR do Reino Unido." : "Your data is protected in accordance with UK GDPR regulations."}
        </p>
    </div>
  );
}
