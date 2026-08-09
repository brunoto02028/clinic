"use client";

import { useState } from "react";
import { Send, Loader2, CheckCircle2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/hooks/use-locale";

/**
 * "Refer this book to a friend" — a one-off invite email, never an
 * auto-subscribe (see app/api/beyond-pain/refer). When referrerName is
 * supplied (the visitor arrived via a ?refFrom= link in a marketing email,
 * resolved server-side to a known EmailContact), the "your name" field is
 * skipped entirely since we already know who's referring.
 */
export function BookReferForm({
  referrerContactId,
  referrerName,
}: {
  referrerContactId?: string;
  referrerName?: string;
}) {
  const { locale } = useLocale();
  const isPt = locale.startsWith("pt");
  const [name, setName] = useState("");
  const [friendEmail, setFriendEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — real visitors never fill this
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const knownReferrer = Boolean(referrerName);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/beyond-pain/refer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          friendEmail,
          referrerContactId,
          referrerName: knownReferrer ? referrerName : name || undefined,
          locale: isPt ? "pt" : "en",
          website,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setStatus("sent");
      setFriendEmail("");
      setName("");
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message || (isPt ? "Algo correu mal. Tente novamente." : "Something went wrong. Please try again."));
    }
  };

  if (status === "sent") {
    return (
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
        <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-2" />
        <p className="text-sm font-semibold text-foreground">{isPt ? "Convite enviado!" : "Invite sent!"}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {isPt ? "O seu amigo vai receber um email com o Capítulo Um grátis." : "Your friend will get an email with the free Chapter One."}
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="text-xs text-primary underline mt-3"
        >
          {isPt ? "Indicar outra pessoa" : "Refer someone else"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-6">
      <div className="flex items-center gap-2 mb-3">
        <Heart className="h-4 w-4 text-primary" />
        <h3 className="font-sora text-sm font-bold text-foreground">
          {isPt ? "Conhece alguém que ia gostar deste livro?" : "Know someone who'd love this book?"}
        </h3>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        {knownReferrer ? (
          <p className="text-xs text-muted-foreground">
            {isPt ? "Indicando como" : "Referring as"} <span className="font-semibold text-foreground">{referrerName}</span>
          </p>
        ) : (
          <Input
            type="text"
            placeholder={isPt ? "O seu nome (opcional)" : "Your name (optional)"}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
        <Input
          type="email"
          required
          placeholder={isPt ? "Email do seu amigo" : "Your friend's email"}
          value={friendEmail}
          onChange={(e) => setFriendEmail(e.target.value)}
        />
        {/* Honeypot — hidden from real visitors via off-screen CSS (not display:none, so
            bots that skip hidden fields but still parse basic CSS get caught too). */}
        <input
          type="text"
          name="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0 }}
        />

        {status === "error" && <p className="text-xs text-destructive">{errorMsg}</p>}

        <Button type="submit" disabled={!friendEmail || status === "loading"} size="sm" className="gap-2">
          {status === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          {isPt ? "Indicar" : "Refer a friend"}
        </Button>
        <p className="text-[11px] text-muted-foreground/80">
          {isPt
            ? "Enviamos só 1 email avulso — o seu amigo não é inscrito automaticamente em nada."
            : "We'll send just 1 one-off email — your friend isn't automatically signed up for anything."}
        </p>
      </form>
    </div>
  );
}
