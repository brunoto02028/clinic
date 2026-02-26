"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
