"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Mail, MessageCircle, Smartphone, Loader2, CheckCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useLocale } from "@/hooks/use-locale";

type Channel = "EMAIL" | "SMS" | "WHATSAPP";

export default function VerifyPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <VerifyPage />
    </Suspense>
  );
}

function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";

  const userId = searchParams?.get("userId") || "";
  const email = searchParams?.get("email") || "";

  const [step, setStep] = useState<"choose" | "input">("choose");
  const [channel, setChannel] = useState<Channel | null>(null);
  const [maskedContact, setMaskedContact] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for expiration
  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setTimeLeft(diff);
      if (diff === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  // Cooldown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const sendCode = useCallback(async (selectedChannel: Channel) => {
    setIsSending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, channel: selectedChannel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send code");

      setChannel(selectedChannel);
      setMaskedContact(data.maskedContact || "");
      setExpiresAt(new Date(data.expiresAt));
      setTimeLeft(600);
      setCooldown(60);
      setStep("input");
      setCode(["", "", "", "", "", ""]);
      // Focus first input
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.message || "Failed to send code");
    } finally {
      setIsSending(false);
    }
  }, [userId]);

  const verifyCode = async () => {
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setError(isPt ? "Digite o código de 6 dígitos completo" : "Please enter the full 6-digit code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code: fullCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");

      setSuccess(true);

      // Auto-login after successful verification
      const decodedEmail = decodeURIComponent(email);
      // Small delay for UX
      setTimeout(async () => {
        // We can't auto-login since we don't have the password at this point
        // Redirect to login page with success message
        router.replace("/login?verified=true");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, "").slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    // Auto-advance to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (digit && index === 5 && newCode.every((d) => d !== "")) {
      setTimeout(() => verifyCode(), 100);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter") {
      verifyCode();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 0) return;
    const newCode = [...code];
    for (let i = 0; i < pasted.length; i++) {
      newCode[i] = pasted[i];
    }
    setCode(newCode);
    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();
    if (pasted.length === 6) {
      setTimeout(() => {
        const fullCode = newCode.join("");
        if (fullCode.length === 6) verifyCode();
      }, 100);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const channelIcon = (ch: Channel) => {
    if (ch === "EMAIL") return <Mail className="h-5 w-5" />;
    if (ch === "SMS") return <Smartphone className="h-5 w-5" />;
    return <MessageCircle className="h-5 w-5" />;
  };

  const channelLabel = (ch: Channel) => {
    if (ch === "EMAIL") return isPt ? "E-mail" : "Email";
    if (ch === "SMS") return "SMS";
    return "WhatsApp";
  };

  const channelDesc = (ch: Channel) => {
    if (ch === "EMAIL") return isPt ? `Enviar para ${email ? decodeURIComponent(email) : "seu e-mail"}` : `Send to ${email ? decodeURIComponent(email) : "your email"}`;
    if (ch === "SMS") return isPt ? "Enviar SMS para seu celular" : "Send SMS to your phone";
    return isPt ? "Enviar via WhatsApp" : "Send via WhatsApp";
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SiteHeader currentPage="other" />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-6">
              <p className="text-muted-foreground mb-4">
                {isPt ? "Link de verificação inválido." : "Invalid verification link."}
              </p>
              <Link href="/signup"><Button>{isPt ? "Criar conta" : "Create account"}</Button></Link>
            </CardContent>
          </Card>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader currentPage="other" />
      <main className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-md">
          {success ? (
            // ─── Success state ───
            <Card className="border-0 shadow-xl">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">
                  {isPt ? "Conta verificada!" : "Account verified!"}
                </h2>
                <p className="text-muted-foreground text-sm mb-4">
                  {isPt ? "Redirecionando para o login..." : "Redirecting to login..."}
                </p>
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
              </CardContent>
            </Card>
          ) : step === "choose" ? (
            // ─── Channel selection ───
            <Card className="border-0 shadow-xl">
              <CardHeader className="text-center">
                <CardTitle className="text-xl font-bold">
                  {isPt ? "Verifique sua conta" : "Verify your account"}
                </CardTitle>
                <CardDescription>
                  {isPt
                    ? "Escolha como deseja receber o código de verificação"
                    : "Choose how you'd like to receive your verification code"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                {/* Email — always available */}
                <button
                  onClick={() => sendCode("EMAIL")}
                  disabled={isSending}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{isPt ? "E-mail" : "Email"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {email ? decodeURIComponent(email) : (isPt ? "Enviar para seu e-mail" : "Send to your email")}
                    </p>
                  </div>
                  {isSending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </button>

                {/* WhatsApp */}
                <button
                  onClick={() => sendCode("WHATSAPP")}
                  disabled={isSending}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-[#25D366] hover:bg-[#25D366]/5 transition-all text-left group"
                >
                  <div className="w-12 h-12 rounded-full bg-[#25D366]/10 text-[#25D366] flex items-center justify-center shrink-0 group-hover:bg-[#25D366]/20 transition-colors">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">WhatsApp</p>
                    <p className="text-xs text-muted-foreground">
                      {isPt ? "Enviar via WhatsApp" : "Send via WhatsApp"}
                    </p>
                  </div>
                </button>

                {/* SMS */}
                <button
                  onClick={() => sendCode("SMS")}
                  disabled={isSending}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-purple-500 hover:bg-purple-50 transition-all text-left group"
                >
                  <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 group-hover:bg-purple-200 transition-colors">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">SMS</p>
                    <p className="text-xs text-muted-foreground">
                      {isPt ? "Enviar SMS para seu celular" : "Send SMS to your phone"}
                    </p>
                  </div>
                </button>

                <div className="pt-2 text-center">
                  <Link href="/signup" className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {isPt ? "Voltar para cadastro" : "Back to signup"}
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            // ─── Code input ───
            <Card className="border-0 shadow-xl">
              <CardHeader className="text-center">
                <CardTitle className="text-xl font-bold">
                  {isPt ? "Digite o código" : "Enter verification code"}
                </CardTitle>
                <CardDescription>
                  {isPt
                    ? `Enviamos um código de 6 dígitos via ${channelLabel(channel!)} para`
                    : `We sent a 6-digit code via ${channelLabel(channel!)} to`}
                  <br />
                  <span className="font-medium text-foreground">{maskedContact}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                {/* 6-digit input boxes */}
                <div className="flex justify-center gap-2 sm:gap-3 mb-6" onPaste={handlePaste}>
                  {code.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      className="w-11 h-14 sm:w-12 sm:h-16 text-center text-xl sm:text-2xl font-bold border-2 border-border rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-background"
                      autoComplete="one-time-code"
                    />
                  ))}
                </div>

                {/* Timer */}
                {timeLeft > 0 && (
                  <p className="text-center text-sm text-muted-foreground mb-4">
                    {isPt ? "Código expira em" : "Code expires in"}{" "}
                    <span className={`font-mono font-medium ${timeLeft < 60 ? "text-red-500" : "text-foreground"}`}>
                      {formatTime(timeLeft)}
                    </span>
                  </p>
                )}

                {timeLeft === 0 && expiresAt && (
                  <p className="text-center text-sm text-red-500 mb-4">
                    {isPt ? "Código expirado. Solicite um novo." : "Code expired. Request a new one."}
                  </p>
                )}

                {/* Verify button */}
                <Button
                  onClick={verifyCode}
                  className="w-full"
                  size="lg"
                  disabled={isLoading || code.join("").length !== 6}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {isPt ? "Verificando..." : "Verifying..."}
                    </>
                  ) : (
                    isPt ? "Verificar" : "Verify"
                  )}
                </Button>

                {/* Resend + change channel */}
                <div className="flex flex-col items-center gap-2 mt-4">
                  <button
                    onClick={() => channel && sendCode(channel)}
                    disabled={cooldown > 0 || isSending}
                    className="text-sm text-primary hover:underline disabled:text-muted-foreground disabled:no-underline inline-flex items-center gap-1"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSending ? "animate-spin" : ""}`} />
                    {cooldown > 0
                      ? `${isPt ? "Reenviar em" : "Resend in"} ${cooldown}s`
                      : (isPt ? "Reenviar código" : "Resend code")}
                  </button>

                  <button
                    onClick={() => { setStep("choose"); setError(""); setCode(["", "", "", "", "", ""]); }}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isPt ? "Mudar método de verificação" : "Change verification method"}
                  </button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
