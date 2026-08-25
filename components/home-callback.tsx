"use client";

// Home "request a callback" form (activity 17, C3). Low-commitment contact:
// name + phone only. Posts to /api/callback, which creates a SalesLead visible
// in /admin/sales. Honeypot field (hp_url) mirrors the anti-bot pattern from
// activity 16; no Turnstile here on purpose, to keep friction minimal.

import { useState } from "react";
import { PhoneCall, Check } from "lucide-react";

export function HomeCallback({ isPt = false }: { isPt?: boolean }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bestTime, setBestTime] = useState("");
  const [hp, setHp] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, bestTime, website: hp }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "error");
      }
      setStatus("done");
    } catch (err: any) {
      setStatus("error");
      setError(
        isPt
          ? "Não foi possível enviar. Tente novamente ou fale no WhatsApp."
          : "Couldn't send. Please try again or reach us on WhatsApp."
      );
    }
  }

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-[#4F7361]">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-3xl shadow-lg p-7 sm:p-10">
          {status === "done" ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-[#4F7361]/10 flex items-center justify-center mx-auto mb-4">
                <Check className="h-6 w-6 text-[#4F7361]" />
              </div>
              <h3 className="font-sora text-xl font-bold text-foreground mb-1">
                {isPt ? "Recebemos o seu pedido" : "We've got your request"}
              </h3>
              <p className="text-muted-foreground text-sm">
                {isPt
                  ? "Vamos ligar em breve. Se preferir, fale já pelo WhatsApp."
                  : "We'll call you back shortly. Prefer now? Reach us on WhatsApp."}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-[#4F7361]/10 flex items-center justify-center flex-shrink-0">
                  <PhoneCall className="h-5 w-5 text-[#4F7361]" />
                </div>
                <h3 className="font-sora text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                  {isPt ? "Prefere que a gente ligue?" : "Prefer us to call you?"}
                </h3>
              </div>
              <p className="text-muted-foreground text-sm mb-6 sm:pl-[52px]">
                {isPt
                  ? "Deixe o seu nome e telefone — retornamos a ligação, sem compromisso."
                  : "Leave your name and number — we'll call you back, no commitment."}
              </p>
              <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
                {/* Honeypot — hidden from users, catches bots */}
                <input
                  type="text"
                  name="hp_url"
                  value={hp}
                  onChange={(e) => setHp(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="hidden"
                />
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    {isPt ? "Nome" : "Name"}
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={isPt ? "O seu nome" : "Your name"}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4F7361] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    {isPt ? "Telefone" : "Phone"}
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={isPt ? "O seu telefone" : "Your phone number"}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4F7361] transition-colors"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    {isPt ? "Melhor horário (opcional)" : "Best time to call (optional)"}
                  </label>
                  <input
                    type="text"
                    value={bestTime}
                    onChange={(e) => setBestTime(e.target.value)}
                    placeholder={isPt ? "Ex.: tarde, após as 18h" : "e.g. afternoons, after 6pm"}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4F7361] transition-colors"
                  />
                </div>
                {error && <p className="sm:col-span-2 text-sm text-rose-600">{error}</p>}
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#4F7361] text-white font-semibold rounded-xl px-6 py-3 text-sm hover:bg-[#456352] transition-colors disabled:opacity-60"
                  >
                    {status === "loading"
                      ? isPt ? "Enviando..." : "Sending..."
                      : isPt ? "Solicitar retorno" : "Request a callback"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
