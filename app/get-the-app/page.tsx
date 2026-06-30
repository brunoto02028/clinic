"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Smartphone, Calendar, FileText, Video, Activity,
  MessageCircle, Bell, CheckCircle2, ArrowRight, Mail,
  Shield, Star, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useLocale } from "@/hooks/use-locale";

// App Store URLs — update these when the app launches
const APP_STORE_URL = ""; // e.g. "https://apps.apple.com/app/bpr-clinic/id..."
const PLAY_STORE_URL = ""; // e.g. "https://play.google.com/store/apps/details?id=com.bpr.rehab"
const QR_URL = "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https://bpr.rehab/get-the-app&color=ffffff&bgcolor=0f172a&qzone=2";

export default function GetTheAppPage() {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";

  useEffect(() => {
    setMounted(true);
    fetch("/api/settings").then(r => r.ok ? r.json() : {}).then(d => setSettings(d)).catch(() => {});
  }, []);

  if (!mounted) return null;

  const L = (en: string, pt: string) => isPt ? pt : en;
  const isLaunched = !!(APP_STORE_URL || PLAY_STORE_URL);

  const handleNotify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "App Launch Notification",
          email,
          message: `[APP LAUNCH NOTIFY] ${email} wants to be notified when the BPR Clinic app launches.`,
          locale,
        }),
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const features = [
    { icon: Calendar, color: "bg-blue-500/20 text-blue-400", en: "Book & manage appointments", pt: "Agendar e gerir consultas" },
    { icon: FileText, color: "bg-emerald-500/20 text-emerald-400", en: "View your treatment plan & clinical records", pt: "Ver plano de tratamento e fichas clínicas" },
    { icon: Video, color: "bg-violet-500/20 text-violet-400", en: "Access personalised exercise videos", pt: "Aceder a vídeos de exercícios personalizados" },
    { icon: Activity, color: "bg-orange-500/20 text-orange-400", en: "Track your recovery progress over time", pt: "Acompanhar a evolução da sua recuperação" },
    { icon: MessageCircle, color: "bg-rose-500/20 text-rose-400", en: "Secure messaging with your therapist", pt: "Mensagens seguras com o seu terapeuta" },
    { icon: Bell, color: "bg-amber-500/20 text-amber-400", en: "Appointment reminders & treatment notifications", pt: "Lembretes de consulta e notificações de tratamento" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <SiteHeader currentPage="app" initialSettings={settings} />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-20 sm:py-28">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-secondary/10 blur-3xl" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/* App icon */}
            <div className="inline-flex items-center justify-center w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-br from-primary to-secondary shadow-2xl shadow-primary/30 mb-8">
              {settings?.logoUrl ? (
                <img src={settings.logoUrl} alt="BPR" className="w-16 h-16 sm:w-20 sm:h-20 object-contain" />
              ) : (
                <span className="text-3xl sm:text-4xl font-black text-white">BPR</span>
              )}
            </div>

            {/* Launch badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-6">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              {L("Coming Soon — iOS & Android", "Em Breve — iOS e Android")}
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-6">
              {L("BPR Clinic App", "App BPR Clinic")}
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary text-2xl sm:text-3xl lg:text-4xl font-bold mt-2">
                {L("Your clinic. In your pocket.", "A sua clínica. No seu bolso.")}
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
              {L(
                "Book appointments, follow your treatment plan, access exercise videos, and stay connected with your therapist — all from your phone. Launching soon on the App Store and Google Play.",
                "Agende consultas, siga o seu plano de tratamento, aceda a vídeos de exercícios e mantenha contacto com o seu terapeuta — tudo a partir do seu telemóvel. A lançar em breve na App Store e Google Play."
              )}
            </p>

            {/* Store badges + QR */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              {/* Apple App Store */}
              {isLaunched && APP_STORE_URL ? (
                <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
                  <AppStoreBadge locale={locale} />
                </a>
              ) : (
                <div className="relative group cursor-not-allowed">
                  <AppStoreBadge locale={locale} className="opacity-50" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{L("Coming Soon", "Em Breve")}</span>
                  </div>
                </div>
              )}

              {/* Google Play */}
              {isLaunched && PLAY_STORE_URL ? (
                <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">
                  <PlayStoreBadge locale={locale} />
                </a>
              ) : (
                <div className="relative group cursor-not-allowed">
                  <PlayStoreBadge locale={locale} className="opacity-50" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{L("Coming Soon", "Em Breve")}</span>
                  </div>
                </div>
              )}

              {/* QR Code */}
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-900 p-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={QR_URL}
                    alt="QR Code — bpr.rehab/get-the-app"
                    width={90}
                    height={90}
                    className="rounded-xl"
                  />
                </div>
                <p className="text-xs text-slate-500">{L("Scan to open", "Scan para abrir")}</p>
              </div>
            </div>

            {/* Notify me form */}
            {!isLaunched && (
              <div className="max-w-md mx-auto">
                <p className="text-slate-400 text-sm mb-4">{L("Get notified when the app launches:", "Receber notificação quando o app lançar:")}</p>
                {submitted ? (
                  <div className="flex items-center justify-center gap-2 text-emerald-400 font-medium">
                    <CheckCircle2 className="h-5 w-5" />
                    {L("You're on the list!", "Está na lista!")}
                  </div>
                ) : (
                  <form onSubmit={handleNotify} className="flex gap-2">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder={L("your@email.com", "seu@email.com")}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-primary transition-colors"
                    />
                    <Button type="submit" disabled={submitting} className="gap-1.5 shrink-0">
                      <Bell className="h-4 w-4" />
                      {L("Notify me", "Notificar")}
                    </Button>
                  </form>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Features */}
        <section className="py-16 sm:py-20 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">{L("Everything you need, one app", "Tudo o que precisa, num único app")}</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">{L("Designed to make your rehabilitation experience seamless — from booking to recovery tracking.", "Concebido para tornar a sua experiência de reabilitação perfeita — desde a marcação ao acompanhamento da recuperação.")}</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((f, i) => (
                <div key={i} className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors">
                  <div className={`w-11 h-11 rounded-xl ${f.color} flex items-center justify-center shrink-0`}>
                    <f.icon className="h-5 w-5" />
                  </div>
                  <p className="text-foreground font-medium leading-snug pt-2">{L(f.en, f.pt)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Social proof / coming soon emphasis */}
        <section className="py-16 sm:py-20 bg-card/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid sm:grid-cols-3 gap-6 text-center">
              {[
                { icon: Shield, en_t: "Secure & Private", pt_t: "Seguro e Privado", en_d: "Your health data is encrypted end-to-end and stored in compliance with UK GDPR and NHS data standards.", pt_d: "Os seus dados de saúde são encriptados de ponta a ponta e armazenados em conformidade com o UK GDPR e as normas de dados do NHS." },
                { icon: Star, en_t: "Built for Patients", pt_t: "Construído para Pacientes", en_d: "Designed alongside our patients for simplicity — no technical knowledge required. If you can use a smartphone, you can use BPR.", pt_d: "Concebido ao lado dos nossos pacientes pela simplicidade — sem conhecimento técnico necessário. Se consegue usar um smartphone, consegue usar a BPR." },
                { icon: Clock, en_t: "Always Available", pt_t: "Sempre Disponível", en_d: "Access your treatment plan, exercise library, and appointment history any time — even offline for saved content.", pt_d: "Aceda ao seu plano de tratamento, biblioteca de exercícios e histórico de consultas a qualquer hora — mesmo offline para conteúdo guardado." },
              ].map((item, i) => (
                <Card key={i} className="border-0 shadow-sm bg-card">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-bold text-foreground mb-2">{L(item.en_t, item.pt_t)}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{L(item.en_d, item.pt_d)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA back to site */}
        <section className="py-14 bg-background text-center">
          <div className="max-w-2xl mx-auto px-4">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3">{L("Can't wait? Book online now.", "Não pode esperar? Marque online agora.")}</h2>
            <p className="text-muted-foreground mb-6 text-sm">{L("Our full booking system is already available on the web.", "O nosso sistema completo de marcações já está disponível na web.")}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/signup">
                <Button size="lg" className="gap-2 w-full sm:w-auto">{L("Book Appointment", "Marcar Consulta")} <ArrowRight className="h-5 w-5" /></Button>
              </Link>
              <Link href="/">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">{L("Back to Clinic", "Voltar à Clínica")}</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function AppStoreBadge({ locale, className = "" }: { locale: string; className?: string }) {
  const isPt = locale === "pt-BR";
  return (
    <div className={`flex items-center gap-3 px-5 py-3 bg-black rounded-2xl border border-white/10 min-w-[160px] ${className}`}>
      <svg viewBox="0 0 24 24" className="w-7 h-7 text-white fill-current shrink-0">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
      <div>
        <p className="text-white/60 text-[9px] leading-none">{isPt ? "Disponível em" : "Download on the"}</p>
        <p className="text-white text-sm font-semibold leading-tight">App Store</p>
      </div>
    </div>
  );
}

function PlayStoreBadge({ locale, className = "" }: { locale: string; className?: string }) {
  const isPt = locale === "pt-BR";
  return (
    <div className={`flex items-center gap-3 px-5 py-3 bg-black rounded-2xl border border-white/10 min-w-[160px] ${className}`}>
      <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current shrink-0" style={{ color: "#01875f" }}>
        <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.847l1.994 1.154a1 1 0 010 1.732l-1.994 1.154L15.396 12l2.302-2.14zM5.864 2.658L16.8 8.99l-2.302 2.302-8.635-8.635z" />
      </svg>
      <div>
        <p className="text-white/60 text-[9px] leading-none">{isPt ? "Disponível no" : "Get it on"}</p>
        <p className="text-white text-sm font-semibold leading-tight">Google Play</p>
      </div>
    </div>
  );
}
