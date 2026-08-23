"use client";

import { useState } from "react";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";

// Footer newsletter signup (P4 of BPR_Devin_Spec_Website_Improvements.md) —
// feeds the same EmailContact/Lead list as the article lead-magnets.
export function NewsletterSignup({ isPt = false }: { isPt?: boolean }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot — real visitors never fill this
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setError(isPt ? "É necessário aceitar para se inscrever." : "Please accept to subscribe.");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, consent, locale: isPt ? "pt" : "en", website }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setStatus("done");
    } catch {
      setStatus("error");
      setError(isPt ? "Não foi possível inscrever. Tente novamente." : "Couldn't subscribe. Please try again.");
    }
  };

  if (status === "done") {
    return (
      <div className="flex items-center gap-2 text-sm text-primary">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        {isPt ? "Inscrito! Obrigado." : "Subscribed — thank you!"}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
      />
      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">
        {isPt ? "Receba novidades" : "Get our newsletter"}
      </h4>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={isPt ? "Seu e-mail" : "Your email"}
            className="w-full pl-8 pr-2 py-2 rounded-lg bg-white/10 text-white placeholder:text-slate-500 text-sm border border-white/10 focus:outline-none focus:border-primary/50"
          />
        </div>
        <button
          type="submit"
          disabled={status === "loading"}
          className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 shrink-0"
        >
          {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : isPt ? "Inscrever" : "Subscribe"}
        </button>
      </div>
      <label className="flex items-start gap-2 text-[11px] text-slate-500 leading-snug cursor-pointer">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 shrink-0"
        />
        {isPt
          ? "Aceito receber e-mails e concordo com a Política de Privacidade."
          : "I agree to receive emails and accept the Privacy Policy."}
      </label>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </form>
  );
}
