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
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Shield,
  Sparkles,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Turnstile } from "@/components/turnstile";

export default function SimplifiedSignupForm() {
  const router = useRouter();
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReset, setTurnstileReset] = useState(0); // bump to force a fresh challenge
  const [website, setWebsite] = useState(""); // honeypot — real visitors never fill this
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  useEffect(() => {
    setMounted(true);
  }, []);

  const stepTitles = {
    1: { en: "What's your name?", pt: "Qual é o seu nome?" },
    2: { en: "Your email & password", pt: "Seu e-mail e senha" },
    3: { en: "Almost done!", pt: "Quase lá!" },
  };

  const stepSubtitles = {
    1: { en: "We'll use this to personalize your experience", pt: "Usaremos isso para personalizar sua experiência" },
    2: { en: "This will be your login credentials", pt: "Estas serão suas credenciais de acesso" },
    3: { en: "Just accept the terms and you're ready!", pt: "Apenas aceite os termos e você está pronto!" },
  };

  const motivationalMessages = {
    1: { en: "Great start! 🎉", pt: "Ótimo começo! 🎉" },
    2: { en: "You're doing great! 💪", pt: "Você está indo bem! 💪" },
    3: { en: "Almost there! 🚀", pt: "Quase lá! 🚀" },
  };

  const handleNext = () => {
    setError("");
    
    // Validate current step
    if (step === 1) {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        setError(isPt ? "Por favor, preencha seu nome completo" : "Please fill in your full name");
        return;
      }
    }
    
    if (step === 2) {
      if (!formData.email.trim()) {
        setError(isPt ? "Por favor, insira seu e-mail" : "Please enter your email");
        return;
      }
      if (!formData.password || formData.password.length < 8) {
        setError(isPt ? "A senha deve ter pelo menos 8 caracteres" : "Password must be at least 8 characters");
        return;
      }
    }

    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!termsAccepted) {
      setError(isPt ? "Você deve aceitar os Termos de Uso" : "You must accept the Terms of Use");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          role: "PATIENT",
          preferredLocale: locale,
          turnstileToken,
          website,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Registration failed");
      }

      const userId = data.user?.id;
      const userEmail = encodeURIComponent(formData.email);
      try {
        sessionStorage.setItem("pending-verify-email", formData.email);
        sessionStorage.setItem("pending-verify-password", formData.password);
      } catch {}
      router.replace(`/verify?userId=${userId}&email=${userEmail}`);
    } catch (err: any) {
      console.error("Signup error:", err);
      setError(err?.message || (isPt ? "Erro ao criar conta. Tente novamente." : "Failed to create account. Please try again."));
      // A Turnstile token is single-use — reset so the next attempt gets a fresh one.
      setTurnstileToken(null);
      setTurnstileReset((v) => v + 1);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="w-full max-w-md">
      <Card className="border-0 shadow-xl">
        <CardHeader className="space-y-4 text-center pb-4">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl font-bold">
              {isPt ? "Criar Conta" : "Create Account"}
            </CardTitle>
          </div>
          
          {/* Progress */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">
                {isPt ? `Passo ${step} de ${totalSteps}` : `Step ${step} of ${totalSteps}`}
              </span>
              <span className="font-semibold text-primary">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Title */}
          <div className="space-y-1 pt-2">
            <h3 className="text-lg font-semibold">
              {isPt ? stepTitles[step as keyof typeof stepTitles].pt : stepTitles[step as keyof typeof stepTitles].en}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isPt ? stepSubtitles[step as keyof typeof stepSubtitles].pt : stepSubtitles[step as keyof typeof stepSubtitles].en}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={step === totalSteps ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }} className="space-y-4">
            {/* Step 1: Name */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-5 duration-300">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{isPt ? "Nome" : "First Name"}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="firstName"
                      type="text"
                      placeholder={isPt ? "João" : "John"}
                      className="pl-10"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      autoFocus
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">{isPt ? "Sobrenome" : "Last Name"}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="lastName"
                      type="text"
                      placeholder={isPt ? "Silva" : "Smith"}
                      className="pl-10"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Email & Password */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-5 duration-300">
                <div className="space-y-2">
                  <Label htmlFor="email">{isPt ? "E-mail" : "Email"}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      className="pl-10"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      autoFocus
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">{isPt ? "Senha" : "Password"}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isPt ? "Mínimo 8 caracteres" : "Minimum 8 characters"}
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Terms */}
            {step === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-5 duration-300">
                {/* Summary */}
                <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>{isPt ? "Resumo da sua conta" : "Account Summary"}</span>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground pl-6">
                    <p><strong>{isPt ? "Nome:" : "Name:"}</strong> {formData.firstName} {formData.lastName}</p>
                    <p><strong>{isPt ? "E-mail:" : "Email:"}</strong> {formData.email}</p>
                  </div>
                </div>

                {/* Terms */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Shield className="h-4 w-4 text-primary" />
                    <span>{isPt ? "Termos de Uso" : "Terms of Use"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isPt
                      ? "Ao criar sua conta, você concorda com nossos Termos de Uso e Política de Privacidade."
                      : "By creating your account, you agree to our Terms of Use and Privacy Policy."}
                  </p>
                  <Link
                    href="/terms"
                    target="_blank"
                    className="text-xs text-primary font-medium hover:underline inline-block"
                  >
                    {isPt ? "Ler Termos Completos →" : "Read Full Terms →"}
                  </Link>
                  <div className="flex items-start gap-3 pt-2">
                    <Checkbox
                      id="terms"
                      checked={termsAccepted}
                      onCheckedChange={(c) => setTermsAccepted(c === true)}
                    />
                    <Label htmlFor="terms" className="text-xs leading-relaxed cursor-pointer">
                      {isPt
                        ? "Li e aceito os Termos de Uso e consinto com o processamento dos meus dados de saúde de acordo com o GDPR."
                        : "I have read and accept the Terms of Use and consent to the processing of my health data in accordance with UK GDPR."}
                    </Label>
                  </div>
                </div>
              </div>
            )}

            {/* Honeypot (anti-bot) — off-screen, real users never fill it */}
            <input
              type="text"
              name="hp_url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
            />

            {/* Turnstile (bot check) — only on the final step */}
            {step === totalSteps && (
              <div className="flex justify-center pt-2">
                <Turnstile onToken={setTurnstileToken} resetSignal={turnstileReset} />
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-3 pt-4">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {isPt ? "Voltar" : "Back"}
                </Button>
              )}
              
              <Button
                type="submit"
                className="flex-1 gap-2"
                disabled={isLoading || (step === 3 && !termsAccepted)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isPt ? "Criando..." : "Creating..."}
                  </>
                ) : step === totalSteps ? (
                  <>
                    {isPt ? "Criar Conta" : "Create Account"}
                    <CheckCircle2 className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    {isPt ? "Continuar" : "Continue"}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Motivational Message */}
          {step < totalSteps && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {isPt ? motivationalMessages[step as keyof typeof motivationalMessages].pt : motivationalMessages[step as keyof typeof motivationalMessages].en}
              </p>
            </div>
          )}

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">{isPt ? "ou" : "or"}</span>
            </div>
          </div>

          {/* Google Sign-Up */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isGoogleLoading || isLoading}
            onClick={async () => {
              setIsGoogleLoading(true);
              try {
                await signIn("google", { callbackUrl: "/dashboard" });
              } catch {
                setError(isPt ? "Erro ao conectar com Google" : "Failed to connect with Google");
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

          <div className="text-center text-sm">
            <span className="text-muted-foreground">{isPt ? "Já tem conta? " : "Already have an account? "}</span>
            <Link href="/login" className="text-primary font-medium hover:underline">
              {isPt ? "Entrar" : "Sign in"}
            </Link>
          </div>
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        {isPt ? "Seus dados são protegidos de acordo com o GDPR" : "Your data is protected in accordance with UK GDPR"}
      </p>
    </div>
  );
}
