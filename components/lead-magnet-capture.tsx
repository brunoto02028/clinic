"use client";

import { useState } from "react";
import { Download, Loader2, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/hooks/use-locale";

interface LeadMagnetCaptureProps {
  tags: string[];
  articleSlug: string;
}

/**
 * Inline lead-magnet capture card (P1.2) — offers a relevant PDF guide in
 * exchange for an email + explicit GDPR consent. Never delivers the PDF
 * directly: submitting only queues a double opt-in confirmation email (see
 * app/api/lead-magnet/capture, app/api/lead-magnet/confirm).
 */
export function LeadMagnetCapture({ tags, articleSlug }: LeadMagnetCaptureProps) {
  const { locale } = useLocale();
  const isPt = locale.startsWith("pt");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/lead-magnet/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName, consent, locale: isPt ? "pt" : "en", tags, articleSlug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setStatus("sent");
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message || (isPt ? "Algo deu errado. Tente novamente." : "Something went wrong. Please try again."));
    }
  };

  if (status === "sent") {
    return (
      <div className="my-10 rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-3" />
        <h3 className="font-sora text-lg font-bold text-foreground mb-2">
          {isPt ? "Quase lá!" : "Almost there!"}
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {isPt
            ? "Enviamos um e-mail de confirmação. Clique no link para receber o seu guia gratuito."
            : "We've sent a confirmation email. Click the link inside to get your free guide."}
        </p>
      </div>
    );
  }

  return (
    <div className="my-10 rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
      <div className="flex items-start gap-4 mb-4">
        <div className="hidden sm:flex h-11 w-11 rounded-xl bg-primary/15 items-center justify-center flex-shrink-0">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-sora text-lg font-bold text-foreground">
            {isPt ? "Quer um guia gratuito sobre este assunto?" : "Want a free guide on this topic?"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {isPt
              ? "Um PDF prático, baseado em evidências, direto na sua caixa de entrada."
              : "A practical, evidence-based PDF, straight to your inbox."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Input
            type="text"
            placeholder={isPt ? "Primeiro nome (opcional)" : "First name (optional)"}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="email"
              required
              placeholder={isPt ? "Seu melhor e-mail" : "Your best email"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <Checkbox id="lead-magnet-consent" checked={consent} onCheckedChange={(c) => setConsent(c === true)} />
          <Label htmlFor="lead-magnet-consent" className="font-normal cursor-pointer text-xs leading-relaxed text-muted-foreground">
            {isPt
              ? "Aceito receber este guia e e-mails ocasionais da BPR por e-mail, de acordo com a Política de Privacidade. Posso cancelar a qualquer momento."
              : "I agree to receive this guide and occasional emails from BPR, in line with the Privacy Policy. I can unsubscribe at any time."}
          </Label>
        </div>

        {status === "error" && <p className="text-xs text-destructive">{errorMsg}</p>}

        <Button type="submit" disabled={!consent || status === "loading"} className="gap-2">
          {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {isPt ? "Enviar meu guia gratuito" : "Send me the free guide"}
        </Button>
      </form>
    </div>
  );
}
