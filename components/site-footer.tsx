"use client";

// Shared public-site footer — mirrors the homepage footer exactly
// (5-column grid: brand/social, navigation, programmes, contact, opening hours + bottom bar).
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Instagram, Facebook, Linkedin, Twitter, Youtube, Globe,
  Mail, Phone, MapPin, MessageCircle, Shield, ArrowRight,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { useLocale } from "@/hooks/use-locale";
import { CookiePreferencesButton } from "@/components/cookie-consent";

const SOCIAL_ICONS: Record<string, any> = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  twitter: Twitter,
  x: Twitter,
  youtube: Youtube,
};

interface SocialLink { id: string; platform: string; url: string }
interface ScheduleEntry { day: string; dayOfWeek: number; open: string; close: string; closed: boolean }

export function SiteFooter() {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const [settings, setSettings] = useState<any>(null);
  const [clinicSchedule, setClinicSchedule] = useState<ScheduleEntry[]>([]);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setSettings(d))
      .catch(() => {});
    fetch("/api/public/schedule")
      .then((r) => r.ok ? r.json() : { schedule: [] })
      .then((data) => { if (Array.isArray(data.schedule)) setClinicSchedule(data.schedule); })
      .catch(() => {});
  }, []);

  const socialLinks: SocialLink[] = (() => {
    try { return settings?.socialLinksJson ? JSON.parse(settings.socialLinksJson) : []; } catch { return []; }
  })();

  const dayOrder = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const dayPt: Record<string,string> = { Sunday:"Domingo",Monday:"Segunda",Tuesday:"Terça",Wednesday:"Quarta",Thursday:"Quinta",Friday:"Sexta",Saturday:"Sábado" };
  const sortedHours = clinicSchedule.length > 0
    ? [...clinicSchedule].sort((a,b) => a.dayOfWeek - b.dayOfWeek)
    : dayOrder.map((d,i) => ({ day: d, dayOfWeek: i, open: "09:00", close: "18:00", closed: d === "Sunday" }));

  return (
    <footer className="bg-[#20242D] text-white mt-auto site-footer-web-only">
      {/* Main footer grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">

          {/* Col 1 — Brand */}
          <div className="lg:col-span-1">
            {settings && (
              <div className="mb-4">
                <Logo
                  logoUrl={settings.screenLogos?.landingFooter?.logoUrl || settings.logoUrl}
                  darkLogoUrl={settings.screenLogos?.landingFooter?.darkLogoUrl || settings.darkLogoUrl}
                  size="md"
                  linkTo="/"
                />
              </div>
            )}
            <p className="text-slate-400 text-sm leading-relaxed mb-5">
              {settings?.tagline || (isPt
                ? "Reabilitação física personalizada. A tecnologia ao serviço do teu regresso a uma vida plena."
                : "Personalised physical rehabilitation. Technology at the service of your return to a full life.")}
            </p>
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-3">
                {socialLinks.map(s => {
                  const SIcon = SOCIAL_ICONS[s.platform.toLowerCase()] || Globe;
                  return (
                    <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer"
                      className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/20 transition-all"
                      title={s.platform}>
                      <SIcon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Col 2 — Navigation */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-5">{isPt ? "Navegação" : "Navigation"}</h4>
            <ul className="space-y-3">
              {[
                { labelEn: "The Method",   labelPt: "O Método",    href: "/#method" },
                { labelEn: "Technology",   labelPt: "Tecnologia",  href: "/#equipment" },
                { labelEn: "About Bruno",  labelPt: "Sobre Bruno", href: "/#about" },
                { labelEn: "Articles",     labelPt: "Artigos",     href: "/articles" },
                { labelEn: "Contact",      labelPt: "Contacto",    href: "/#contact" },
              ].map((item) => (
                <li key={item.labelEn}>
                  <Link href={item.href} className="text-slate-400 hover:text-white text-sm transition-colors">
                    {isPt ? item.labelPt : item.labelEn}
                  </Link>
                </li>
              ))}
              <li className="pt-2">
                <Link href="/signup" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
                  {isPt ? "Começar o Programa" : "Start Programme"} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3 — Programmes */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-5">{isPt ? "Programas" : "Programmes"}</h4>
            <ul className="space-y-3">
              {[
                { labelEn: "MLS® Laser Therapy",       labelPt: "Laser MLS®",                 href: "/services/mls-laser" },
                { labelEn: "Biomechanical Assessment",  labelPt: "Avaliação Biomecânica",      href: "/biomechanical-assessment" },
                { labelEn: "Biohacking & Performance",  labelPt: "Biohacking & Performance",   href: "/services/biohacking-performance" },
                { labelEn: "HRV & Recovery",            labelPt: "HRV & Recuperação",          href: "/services/hrv-recovery-monitoring" },
                { labelEn: "Sleep & Longevity",         labelPt: "Sono & Longevidade",         href: "/services/sleep-longevity-optimisation" },
                { labelEn: "Advanced Electrotherapy",   labelPt: "Eletroterapia Avançada",     href: "/services/electrotherapy" },
                { labelEn: "Therapeutic Ultrasound",    labelPt: "Ultrassom Terapêutico",      href: "/services/therapeutic-ultrasound" },
                { labelEn: "Exercise Therapy",          labelPt: "Terapia por Exercício",      href: "/services/exercise-therapy" },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-slate-400 hover:text-white text-sm transition-colors">
                    {isPt ? item.labelPt : item.labelEn}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4 — Contact */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-5">{isPt ? "Contacto" : "Contact"}</h4>
            <ul className="space-y-4">
              {settings?.address && (
                <li className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                  <span className="text-slate-400 text-sm leading-relaxed">{settings.address}</span>
                </li>
              )}
              {settings?.phone && (
                <li>
                  <a href={`tel:${settings.phone}`} className="flex items-center gap-3 text-slate-400 hover:text-white text-sm transition-colors">
                    <Phone className="h-4 w-4 text-slate-500 shrink-0" />
                    {settings.phone}
                  </a>
                </li>
              )}
              {settings?.email && (
                <li>
                  <a href={`mailto:${settings.email}`} className="flex items-center gap-3 text-slate-400 hover:text-white text-sm transition-colors">
                    <Mail className="h-4 w-4 text-slate-500 shrink-0" />
                    {settings.email}
                  </a>
                </li>
              )}
              {settings?.whatsappEnabled && settings?.whatsappNumber && (
                <li>
                  <a
                    href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g,'')}${settings.whatsappMessage ? `?text=${encodeURIComponent(settings.whatsappMessage)}` : ''}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 text-[#25D366] hover:text-[#20bd5a] text-sm transition-colors"
                  >
                    <MessageCircle className="h-4 w-4 shrink-0" />
                    WhatsApp
                  </a>
                </li>
              )}
              {!settings?.address && !settings?.phone && !settings?.email && (
                <li className="text-slate-500 text-sm">Ipswich, Suffolk, UK</li>
              )}
            </ul>
          </div>

          {/* Col 5 — Opening Hours */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-5">{isPt ? "Horário" : "Opening Hours"}</h4>
            <ul className="space-y-2">
              {sortedHours.map((h) => {
                const isToday = new Date().toLocaleDateString("en-GB", { weekday: "long" }) === h.day;
                return (
                  <li key={h.day} className={`flex items-center justify-between text-xs ${isToday ? "text-white font-semibold" : "text-slate-400"}`}>
                    <span className="flex items-center gap-1.5">
                      {isToday && <span className="w-1 h-1 rounded-full bg-primary inline-block" />}
                      {isPt ? dayPt[h.day] ?? h.day : h.day}
                    </span>
                    {h.closed ? (
                      <span className="text-red-400/70">{isPt ? "Fechado" : "Closed"}</span>
                    ) : (
                      <span className="tabular-nums">{h.open} – {h.close}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {settings?.footerText || `© ${new Date().getFullYear()} Bruno Physical Rehabilitation. ${isPt ? "Todos os direitos reservados." : "All rights reserved."}`}
          </p>
          <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-end">
            <Link href="/privacy" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              {isPt ? "Privacidade" : "Privacy"}
            </Link>
            <Link href="/cookies" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              Cookies
            </Link>
            <Link href="/terms" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              {isPt ? "Termos" : "Terms"}
            </Link>
            <CookiePreferencesButton />
            <Link href="/login" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              {isPt ? "Portal do Paciente" : "Patient Portal"}
            </Link>
            <Link href="/staff-login" className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">
              <Shield className="h-3 w-3" />
              {isPt ? "Acesso Staff" : "Staff Portal"}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
