"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { LazyLoadSection } from "@/components/lazy-load-section";
import {
  Calendar,
  ClipboardList,
  Users,
  Shield,
  UserCog,
  ShieldCheck,
  ChevronDown,
  Heart,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Zap,
  CheckCircle2,
  Activity,
  BookOpen,
  Clock,
  Menu,
  X,
  Footprints,
  ScanLine,
  Dumbbell,
  Brain,
  Waves,
  Syringe,
  CircleDot,
  MessageCircle,
  Target,
  Timer,
  Sparkles,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  Globe,
  Thermometer,
  Eye,
  Flame,
  Cpu,
  Moon,
  HeartPulse,
  HeartHandshake,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { t, getLocale, setLocale } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

import { VapiVoiceWidget } from "@/components/vapi-voice-widget";
import { NewsletterSignup } from "@/components/newsletter-signup";

// Code splitting - lazy load heavy components
const ThermographyIllustration = dynamic(
  () => import("@/components/thermography-illustration").then(mod => ({ default: mod.ThermographyIllustration })),
  { 
    ssr: false,
    loading: () => <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-800 animate-pulse rounded-2xl" />
  }
);

interface ScreenLogoEntry { logoUrl?: string | null; darkLogoUrl?: string | null; }
interface FooterModules { logo?: boolean; links?: boolean; social?: boolean; contact?: boolean; copyright?: boolean; newsletter?: boolean; }
interface SiteSettings {
  logoUrl?: string | null;
  darkLogoUrl?: string | null;
  screenLogos?: Record<string, ScreenLogoEntry> | null;
  siteName?: string;
  tagline?: string;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  heroImageUrl?: string | null;
  heroCTA?: string | null;
  heroCTALink?: string | null;
  portalTitle?: string | null;
  portalSubtitle?: string | null;
  servicesTitle?: string | null;
  servicesSubtitle?: string | null;
  aboutTitle?: string | null;
  aboutText?: string | null;
  aboutImageUrl?: string | null;
  articlesTitle?: string | null;
  articlesSubtitle?: string | null;
  articlesPlaceholderTitle?: string | null;
  articlesPlaceholderText?: string | null;
  contactTitle?: string | null;
  contactSubtitle?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  footerText?: string | null;
  insolesTitle?: string | null;
  insolesSubtitle?: string | null;
  insolesDesc?: string | null;
  insolesImageUrl?: string | null;
  insolesBenefitsJson?: string | null;
  insolesStepsJson?: string | null;
  bioTitle?: string | null;
  bioSubtitle?: string | null;
  bioDesc?: string | null;
  bioImageUrl?: string | null;
  bioBenefitsJson?: string | null;
  bioStepsJson?: string | null;
  contactCardsJson?: string | null;
  footerLinksJson?: string | null;
  socialLinksJson?: string | null;
  whatsappNumber?: string | null;
  whatsappEnabled?: boolean | null;
  whatsappMessage?: string | null;
  footerModulesJson?: string | null;
  mlsLaserJson?: string | null;
  thermoJson?: string | null;
  thermoImageUrl?: string | null;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  imageUrl?: string;
  createdAt: string;
  author: { firstName: string; lastName: string };
}

interface LandingPageProps {
  initialSettings?: SiteSettings | null;
  initialArticles?: Article[];
}

interface ClinicScheduleEntry { day: string; dayOfWeek: number; open: string; close: string; closed: boolean; }

export default function LandingPage({ initialSettings = null, initialArticles = [] }: LandingPageProps) {
  const [settings, setSettings] = useState<SiteSettings | null>(initialSettings);
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [clinicSchedule, setClinicSchedule] = useState<ClinicScheduleEntry[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [locale, setCurrentLocale] = useState<Locale>("en-GB");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCurrentLocale(getLocale());
    // Only fetch if not provided by SSR
    if (!initialSettings) {
      fetchSettings();
    }
    if (!initialArticles || initialArticles.length === 0) {
      fetchArticles();
    }
    fetch("/api/public/schedule")
      .then(r => r.ok ? r.json() : { schedule: [] })
      .then(data => { if (Array.isArray(data.schedule)) setClinicSchedule(data.schedule); })
      .catch(() => {});
  }, [initialSettings, initialArticles]);

  const toggleLocale = () => {
    const next = locale === "en-GB" ? "pt-BR" : "en-GB";
    setLocale(next);
    setCurrentLocale(next);
    // Broadcast to useLocale() consumers (SiteFooter, etc.)
    window.dispatchEvent(new Event("clinic-locale-change"));
  };

  const T = (key: string) => t(key, locale);
  // S() reads from settings field when locale is EN (settings are single-language English).
  // When PT is selected, always use the i18n translation to avoid mixed languages.
  // Returns null for /uploads/ paths (ephemeral on Render) and empty values
  const validImg = (url: string | null | undefined): string | null => {
    if (!url || url.startsWith('/uploads/')) return null;
    return url;
  };

  const S = (settingsField: keyof SiteSettings | undefined, i18nKey: string) => {
    if (locale === "en-GB" && settingsField && settings && settings[settingsField]) return settings[settingsField] as string;
    return T(i18nKey);
  };

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      const offset = 80; // header height
      const y = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const navAnchors = [
    { id: "method",    label: locale === "pt-BR" ? "O Método"   : "The Method" },
    { id: "equipment", label: locale === "pt-BR" ? "Tecnologia"  : "Technology" },
    { id: "about",     label: locale === "pt-BR" ? "Sobre"        : "About" },
    { id: "contact",   label: locale === "pt-BR" ? "Contacto"    : "Contact" },
  ];

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  };

  const fetchArticles = async () => {
    try {
      const res = await fetch("/api/articles?published=true&limit=3");
      if (res.ok) {
        const data = await res.json();
        setArticles(data);
      }
    } catch (error) {
      console.error("Failed to fetch articles:", error);
    }
  };

  return (
    <div className="public-site min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 header-futuristic">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {settings ? (
              <Logo logoUrl={settings.screenLogos?.landingHeader?.logoUrl || settings.logoUrl} darkLogoUrl={settings.screenLogos?.landingHeader?.darkLogoUrl || settings.darkLogoUrl} size="lg" priority />
            ) : (
              <div style={{ height: 40, width: 40 }} />
            )}

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-5 xl:gap-7">
              {navAnchors.map((a) => (
                <button key={a.id} onClick={() => scrollTo(a.id)} className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium whitespace-nowrap">{a.label}</button>
              ))}
              <Link href="/articles" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium whitespace-nowrap">{T("home.articlesLabel") || "Articles"}</Link>
              <Link href="/help" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium whitespace-nowrap">{locale === "pt-BR" ? "Ajuda" : "Help"}</Link>
            </nav>

            {/* WhatsApp button in header */}
            {settings?.whatsappEnabled && settings?.whatsappNumber && (
              <a
                href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g,'')}${settings.whatsappMessage ? `?text=${encodeURIComponent(settings.whatsappMessage)}` : ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors shadow-sm"
                title="Chat on WhatsApp"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </a>
            )}

            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center gap-2">
              {/* Locale Toggle - only render after mount to avoid hydration mismatch */}
              {mounted && (
              <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5 mr-1">
                <button
                  onClick={() => { if (locale !== "en-GB") toggleLocale(); }}
                  className={`text-[10px] font-medium px-2 py-1 rounded transition-colors ${locale === "en-GB" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >EN</button>
                <button
                  onClick={() => { if (locale !== "pt-BR") toggleLocale(); }}
                  className={`text-[10px] font-medium px-2 py-1 rounded transition-colors ${locale === "pt-BR" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >PT</button>
              </div>
              )}

              <Link href="/staff-login">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <Shield className="h-4 w-4 mr-1" />
                  {T("home.staff")}
                </Button>
              </Link>
              <Link href="/login"><Button variant="ba1Outline">{T("home.patientLogin")}</Button></Link>
              <Link href="/signup"><Button variant="ba1Primary">{locale === "pt-BR" ? "Começar" : "Start Programme"}</Button></Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center gap-2 lg:hidden">
              {mounted && (
              <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
                <button onClick={() => { if (locale !== "en-GB") toggleLocale(); }}
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors ${locale === "en-GB" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                >EN</button>
                <button onClick={() => { if (locale !== "pt-BR") toggleLocale(); }}
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors ${locale === "pt-BR" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                >PT</button>
              </div>
              )}
              <button className="p-2 rounded-lg hover:bg-muted" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="h-6 w-6 text-foreground" /> : <Menu className="h-6 w-6 text-foreground" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div>
              <nav className="flex flex-col gap-1">
                {navAnchors.map((a) => (
                  <button key={a.id} onClick={() => { scrollTo(a.id); setMobileMenuOpen(false); }} className="text-left text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-lg px-3 py-2.5 font-medium transition-colors">{a.label}</button>
                ))}
                <Link href="/articles" onClick={() => setMobileMenuOpen(false)} className="text-left text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-lg px-3 py-2.5 font-medium transition-colors">{T("home.articlesLabel") || "Articles"}</Link>
                <Link href="/help" onClick={() => setMobileMenuOpen(false)} className="text-left text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-lg px-3 py-2.5 font-medium transition-colors">{locale === "pt-BR" ? "Ajuda" : "Help"}</Link>
                <div className="flex flex-col gap-2 pt-4 border-t border-border">
                  <Link href="/login"><Button variant="ba1Outline" className="w-full">{T("home.patientLogin")}</Button></Link>
                  <Link href="/signup"><Button variant="ba1Primary" className="w-full">{T("home.getStarted")}</Button></Link>
                  <div className="space-y-1 pt-2 border-t border-border">
                    <Link href="/staff-login" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground"><Shield className="h-4 w-4 mr-2" />{T("home.staff")}</Button>
                    </Link>
                  </div>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>
      {/* Spacer for fixed header */}
      <div className="h-16 md:h-20" aria-hidden="true" />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-14 sm:py-20 lg:py-28 bg-dot-pattern">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                  {locale === "pt-BR" ? "Reabilitação Física & Desportiva" : "Physical & Sports Rehabilitation"}
                </div>
              </div>
              <div className="inline-flex items-center gap-2.5 bg-rose-50 text-rose-600 font-bold pl-2.5 pr-4 py-2 rounded-full border border-rose-200 shadow-sm mb-5">
                <span className="flex items-center justify-center w-7 h-7 bg-rose-100 rounded-full flex-shrink-0">
                  <HeartHandshake className="h-4 w-4" />
                </span>
                <span className="text-sm sm:text-base">{T("home.healingWithHeart")}</span>
              </div>
              <h1 className="font-sora text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground leading-tight tracking-tight">
                {(() => {
                  const hasSettingsValue = locale === "en-GB" && settings?.heroTitle;
                  const raw = hasSettingsValue || T("home.heroTitle");
                  if (raw.includes("|")) {
                    const [main, highlight] = raw.split("|").map(s => s.trim());
                    return <>{main}{" "}<span className="text-primary">{highlight}</span></>;
                  }
                  if (hasSettingsValue) return <>{raw}</>;
                  return <>{raw}{" "}<span className="text-primary">{T("home.heroTitle2")}</span></>;
                })()}
              </h1>
              <p className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-lg">
                {S("heroSubtitle", "home.heroSubtitle")}
              </p>
              <div className="mt-4 flex items-start gap-2 max-w-lg">
                <HeartHandshake className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-slate-500 italic leading-relaxed">
                  &ldquo;{T("home.healingWithHeartQuote")}&rdquo;
                </p>
              </div>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link href="/signup">
                  <Button size="lg" variant="ba1Primary" className="w-full sm:w-auto gap-2 hover:-translate-y-0.5">
                    {locale === "pt-BR" ? "Começar o Programa" : "Start Your Programme"}
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="ba1Outline" className="w-full sm:w-auto">
                    {locale === "pt-BR" ? "Portal do Paciente" : "Patient Portal"}
                  </Button>
                </Link>
              </div>
              {/* Trust badges */}
              <div className="mt-10 flex flex-wrap gap-4">
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-slate-700">{T("home.fullyInsured")}</span>
                </div>
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-slate-700">{T("home.openEveryDay")}</span>
                </div>
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-slate-700">Ipswich, Suffolk</span>
                </div>
              </div>
            </div>
            {/* Hero image + floating stat card — shown first on mobile (order-first),
                back to normal source order (text first) from lg up. */}
            <div className="relative order-first lg:order-none">
              <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl shadow-slate-200 bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-100">
                {validImg(settings?.heroImageUrl) ? (
                  <Image
                    src={validImg(settings?.heroImageUrl)!}
                    alt="Professional physical rehabilitation treatment session - Bruno Physical Rehabilitation"
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    quality={70}
                    priority
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-slate-300">
                      <Activity className="h-16 w-16 mx-auto mb-2" />
                      <p className="text-sm font-medium">Hero Image</p>
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
              {/* Floating stat cards */}
              <div className="hidden sm:block absolute -top-4 -left-4 sm:-top-6 sm:-left-6 bg-white rounded-2xl p-4 shadow-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center"><HeartHandshake className="h-5 w-5 text-rose-600" /></div>
                  <div><p className="text-base font-bold text-foreground leading-tight">{T("home.healingWithHeart")}</p><p className="text-xs text-muted-foreground">{locale === "pt-BR" ? "Atenção real, não protocolo" : "Real care, not protocol"}</p></div>
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 sm:-bottom-6 sm:-left-6 bg-white rounded-2xl p-4 shadow-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center"><Users className="h-5 w-5 text-primary" /></div>
                  <div><p className="text-xl font-bold text-foreground">{locale === "pt-BR" ? "Personalizado" : "Personalised"}</p><p className="text-xs text-muted-foreground">{locale === "pt-BR" ? "Cuidado 1-para-1" : "1-to-1 Care"}</p></div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 bg-white rounded-2xl p-4 shadow-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
                  <div><p className="text-xl font-bold text-foreground">15+</p><p className="text-xs text-muted-foreground">{T("home.yearsExperience")}</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-8 bg-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { value: "15+", label: locale === "pt-BR" ? "Anos de Experiência" : "Years Experience" },
              { value: locale === "pt-BR" ? "Comprovado" : "Proven", label: locale === "pt-BR" ? "Baseado em Evidências" : "Evidence-Based Care" },
              { value: locale === "pt-BR" ? "Corpo Inteiro" : "Whole-Body", label: locale === "pt-BR" ? "Abordagem Integrada" : "Integrated Approach" },
              { value: locale === "pt-BR" ? "1-para-1" : "1-to-1", label: locale === "pt-BR" ? "Cuidado Personalizado" : "Personalised Care" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl sm:text-4xl font-bold text-white">{stat.value}</p>
                <p className="text-primary-foreground/80 text-sm mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* About Section */}
      <section id="about" className="py-14 sm:py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-5">
                {locale === "pt-BR" ? "Sobre Mim" : "About Me"}
              </span>
              <h2 className="font-sora text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-5 tracking-tight">
                {(() => {
                  const raw = S("aboutTitle", "home.aboutTitle");
                  if (raw.includes("|")) {
                    const [main, highlight] = raw.split("|").map(s => s.trim());
                    return <><span className="text-primary">{main}</span>{" "}{highlight}</>;
                  }
                  return <><span className="text-primary">Bruno Physical</span>{" "}Rehabilitation</>;
                })()}
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                {locale === "en-GB" && settings?.aboutText ? (
                  settings.aboutText.split("\n\n").filter(Boolean).map((p, i) => <p key={i}>{p}</p>)
                ) : (
                  <>
                    <p>{T("home.aboutText1")}</p>
                    <p>{T("home.aboutText2")}</p>
                    <p>{T("home.aboutText3")}</p>
                  </>
                )}
              </div>
              {/* Healing With Heart pull-quote */}
              <div className="mt-6 bg-rose-50 border border-rose-200 rounded-2xl p-5">
                <div className="inline-flex items-center gap-1.5 text-rose-600 text-xs font-bold uppercase tracking-wider mb-2">
                  <HeartHandshake className="h-4 w-4" />
                  {T("home.healingWithHeart")}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed italic">
                  &ldquo;{T("home.healingWithHeartQuote")}&rdquo;
                </p>
              </div>
              {/* Credentials */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: ShieldCheck, label: "STO Registered", color: "text-primary bg-primary/10" },
                  { icon: Sparkles, label: "IPHM Biohacking Practitioner", color: "text-emerald-600 bg-emerald-100" },
                  { icon: Activity, label: "15+ Years of Clinical Experience", color: "text-orange-600 bg-orange-100" },
                  { icon: Users, label: "Ex-Professional Footballer", color: "text-blue-600 bg-blue-100" },
                ].map((c) => (
                  <div key={c.label} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.color}`}><c.icon className="h-4 w-4" /></div>
                    <span className="text-sm font-medium text-foreground">{c.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-7">
                <Link href="/signup">
                  <Button variant="ba1Health" className="gap-2">{T("home.bookConsultation")}<ArrowRight className="h-4 w-4" /></Button>
                </Link>
              </div>
            </div>
            <div>
              <div className="relative aspect-square max-w-md mx-auto lg:max-w-none rounded-3xl overflow-hidden shadow-2xl shadow-slate-200 border border-slate-100">
                {validImg(settings?.aboutImageUrl) ? (
                  <img src={validImg(settings?.aboutImageUrl)!} alt="Bruno - Physical Rehabilitation Specialist" className="object-cover absolute inset-0 w-full h-full" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                    <UserCog className="h-24 w-24 text-primary/20" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ═══ THE METHOD ═══ */}
      <section id="method" className="py-16 sm:py-20 lg:py-28 bg-slate-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
              {locale === "pt-BR" ? "O Método" : "The Method"}
            </span>
            <h2 className="font-sora text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight tracking-tight">
              {locale === "pt-BR" ? "Reabilitação completa." : "Complete rehabilitation."}{" "}
              <span className="text-primary">{locale === "pt-BR" ? "Sem contar sessões." : "We don't count sessions."}</span>
            </h2>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {locale === "pt-BR"
                ? "Cada paciente recebe um programa personalizado, desenhado para tratar a causa raiz — não apenas os sintomas. O tempo que leva é o que for necessário."
                : "Every patient receives a personalised programme designed to treat the root cause — not just the symptoms. It takes as long as it needs to."}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {([
              {
                num: "01",
                icon: ScanLine,
                color: "from-blue-500 to-cyan-500",
                bg: "bg-blue-50 text-blue-600",
                titleEn: "Global Assessment",
                titlePt: "Avaliação Global",
                descEn: "Full-body evaluation using infrared thermography and HRV — to identify the true root cause of your condition.",
                descPt: "Avaliação completa com termografia infravermelha e HRV — para identificar a verdadeira causa do problema.",
              },
              {
                num: "02",
                icon: Zap,
                color: "from-orange-500 to-amber-500",
                bg: "bg-orange-50 text-orange-600",
                titleEn: "Pain Elimination",
                titlePt: "Eliminação da Dor",
                descEn: "MLS® Laser, electrotherapy, microcurrent (MENS) and therapeutic ultrasound accelerate comfort and tissue repair — while movement and re-education deliver the lasting result.",
                descPt: "Laser MLS®, eletroterapia, microcorrente (MENS) e ultrassom terapêutico aceleram o alívio e a reparação tecidual — enquanto o movimento e a reeducação entregam o resultado duradouro.",
              },
              {
                num: "03",
                icon: Activity,
                color: "from-emerald-500 to-teal-500",
                bg: "bg-emerald-50 text-emerald-600",
                titleEn: "Movement Restoration",
                titlePt: "Restauração do Movimento",
                descEn: "Supervised exercise and movement rehabilitation to restore correct movement patterns, muscle balance, and full range of motion — so you return to the activities you love.",
                descPt: "Exercício supervisionado e reabilitação do movimento para restaurar padrões corretos, equilíbrio muscular e amplitude total — para voltares às actividades que amas.",
              },
              {
                num: "04",
                icon: Sparkles,
                color: "from-violet-500 to-purple-500",
                bg: "bg-violet-50 text-violet-600",
                titleEn: "Re-education & Longevity",
                titlePt: "Reeducação & Longevidade",
                descEn: "Biohacking protocols, HRV monitoring, sleep optimisation and lifestyle guidance — so you leave with the knowledge and tools to maintain your health for life.",
                descPt: "Protocolos de biohacking, monitorização de HRV, optimização do sono e orientação de estilo de vida — para saíres com o conhecimento para manter a saúde para sempre.",
              },
            ] as const).map((phase) => (
              <div key={phase.num} className="relative bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md hover:border-primary/20 transition-all">
                <div className={`w-12 h-12 rounded-xl ${phase.bg} flex items-center justify-center mb-4`}>
                  <phase.icon className="h-6 w-6" />
                </div>
                <div className={`absolute top-5 right-5 text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br ${phase.color} opacity-10`}>{phase.num}</div>
                <h3 className="text-lg font-bold text-foreground mb-2">{locale === "pt-BR" ? phase.titlePt : phase.titleEn}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{locale === "pt-BR" ? phase.descPt : phase.descEn}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 bg-white rounded-2xl border border-primary/20 p-6 sm:p-8 flex items-start gap-4 max-w-3xl mx-auto">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                {locale === "pt-BR" ? "Abordagem Multidisciplinar" : "Multidisciplinary Approach"}
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {locale === "pt-BR"
                  ? "O corpo é um sistema. Quando necessário, integramos outros especialistas — dentista (focos dentários), nutricionista, psicólogo — porque a recuperação completa exige olhar o paciente como um todo."
                  : "The body is a system. When needed, we integrate other specialists — dentist (dental foci), nutritionist, psychologist — because complete recovery requires seeing the patient as a whole."}
              </p>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Link href="/signup">
              <Button size="lg" variant="ba1Primary" className="gap-2">
                {locale === "pt-BR" ? "Começar o Programa" : "Start Your Programme"} <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ PATIENT JOURNEY ═══ */}
      {(() => {
        let mls: any = {};
        try { mls = settings?.mlsLaserJson ? JSON.parse(settings.mlsLaserJson) : {}; } catch {}
        const mlsTreatImg = validImg(mls.treatmentImageUrl) || validImg(mls.deviceImageUrl);
        const thermoImg   = validImg(settings?.thermoImageUrl as string | null);

        const phases = [
          {
            key: "assess",
            step: "01",
            img: thermoImg,
            fallbackImg: "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=800&q=80",
            gradient: "from-slate-900/90 via-slate-800/70 to-slate-900/30",
            accent: "bg-blue-400/20 border-blue-300/40 text-blue-200",
            icon: ScanLine,
            stepColor: "text-blue-300",
            tagEn: "Step 01",
            tagPt: "Passo 01",
            titleEn: "We understand your body",
            titlePt: "Percebemos o teu corpo",
            descEn: "A complete 360° assessment — thermography and HRV — to find the real cause, not just the symptom.",
            descPt: "Uma avaliação 360° completa — termografia e HRV — para encontrar a causa real, não apenas o sintoma.",
            techEn: "Thermography · HRV",
            techPt: "Termografia · HRV",
          },
          {
            key: "treat",
            img: mlsTreatImg,
            fallbackImg: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80",
            step: "02",
            gradient: "from-slate-900/90 via-slate-800/70 to-slate-900/30",
            accent: "bg-orange-400/20 border-orange-300/40 text-orange-200",
            icon: Zap,
            stepColor: "text-orange-300",
            tagEn: "Step 02",
            tagPt: "Passo 02",
            titleEn: "We eliminate the pain",
            titlePt: "Eliminamos a dor",
            descEn: "We apply the most effective clinical technologies available to relieve pain fast and repair the damaged tissue at its source.",
            descPt: "Aplicamos as tecnologias clínicas mais eficazes disponíveis para aliviar a dor rapidamente e reparar o tecido lesionado na sua origem.",
            techEn: "MLS® Laser · Electrotherapy · Ultrasound",
            techPt: "Laser MLS® · Eletroterapia · Ultrassom",
          },
          {
            key: "move",
            img: null,
            fallbackImg: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80",
            step: "03",
            gradient: "from-slate-900/90 via-slate-800/70 to-slate-900/30",
            accent: "bg-emerald-400/20 border-emerald-300/40 text-emerald-200",
            icon: Activity,
            stepColor: "text-emerald-300",
            tagEn: "Step 03",
            tagPt: "Passo 03",
            titleEn: "We restore your movement",
            titlePt: "Restauramos o teu movimento",
            descEn: "Supervised movement rehabilitation and exercise to rebuild correct movement patterns, muscle balance and full range of motion.",
            descPt: "Reabilitação do movimento supervisionada e exercício para reconstruir padrões corretos, equilíbrio muscular e amplitude total.",
            techEn: "Movement Rehabilitation · Exercise Therapy",
            techPt: "Reabilitação do Movimento · Exercício Terapêutico",
          },
          {
            key: "live",
            img: null,
            fallbackImg: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80",
            step: "04",
            gradient: "from-slate-900/90 via-slate-800/70 to-slate-900/30",
            accent: "bg-violet-400/20 border-violet-300/40 text-violet-200",
            icon: Sparkles,
            stepColor: "text-violet-300",
            tagEn: "Step 04",
            tagPt: "Passo 04",
            titleEn: "We educate for life",
            titlePt: "Reeducamos para a vida",
            descEn: "You leave with biohacking protocols, HRV monitoring and lifestyle tools — so you stay healthy for life, not just until the next injury.",
            descPt: "Sais com protocolos de biohacking, monitorização HRV e ferramentas de estilo de vida — para te manteres saudável para sempre, não só até à próxima lesão.",
            techEn: "Biohacking · HRV · Sleep Optimisation",
            techPt: "Biohacking · HRV · Optimização do Sono",
          },
        ];

        return (
          <section id="equipment" className="py-16 sm:py-20 lg:py-28 bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
                  {locale === "pt-BR" ? "A Tua Jornada" : "Your Journey"}
                </span>
                <h2 className="font-sora text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                  {locale === "pt-BR"
                    ? "Não vendemos sessões. Entregamos resultados."
                    : "We don't sell sessions. We deliver results."}
                </h2>
                <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                  {locale === "pt-BR"
                    ? "A tecnologia é o meio. O teu regresso a uma vida plena e saudável é o único objetivo."
                    : "Technology is the means. Your return to a full, healthy life is the only goal."}
                </p>
              </div>

              {/* 4 journey phase cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
                {phases.map((ph) => {
                  const imgSrc = ph.img || ph.fallbackImg;
                  return (
                    <div key={ph.key} className="relative rounded-2xl overflow-hidden aspect-[3/4] shadow-lg border border-slate-200 group">
                      <img
                        src={imgSrc}
                        alt={locale === "pt-BR" ? ph.titlePt : ph.titleEn}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className={`absolute inset-0 bg-gradient-to-t ${ph.gradient}`} />

                      {/* Step number watermark */}
                      <div className={`absolute top-4 right-4 text-6xl font-black ${ph.stepColor} opacity-20 leading-none select-none`}>
                        {ph.step}
                      </div>

                      <div className="absolute inset-0 flex flex-col justify-end p-5">
                        <span className={`self-start text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${ph.accent} mb-2`}>
                          {locale === "pt-BR" ? ph.tagPt : ph.tagEn}
                        </span>
                        <h3 className="text-white font-bold text-base leading-tight mb-2">
                          {locale === "pt-BR" ? ph.titlePt : ph.titleEn}
                        </h3>
                        <p className="text-white/80 text-xs leading-relaxed mb-3">
                          {locale === "pt-BR" ? ph.descPt : ph.descEn}
                        </p>
                        <div className="border-t border-white/10 pt-2.5">
                          <p className="text-white/40 text-[10px] uppercase tracking-wider mb-0.5">
                            {locale === "pt-BR" ? "Tecnologia utilizada" : "Technology used"}
                          </p>
                          <p className="text-white/60 text-[11px] font-medium">
                            {locale === "pt-BR" ? ph.techPt : ph.techEn}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Subtle technology note */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6">
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold text-center mb-4">
                  {locale === "pt-BR" ? "Tecnologias clínicas integradas no tratamento" : "Clinical technologies integrated in your treatment"}
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  {([
                    { icon: CircleDot,   en: "MLS® Laser Mphi 75",        pt: "Laser MLS® Mphi 75",        href: "/services/mls-laser" },
                    { icon: Thermometer, en: "Infrared Thermography",      pt: "Termografia Infravermelha",  href: "/services/mls-laser" },
                    { icon: HeartPulse,  en: "HRV Monitoring",             pt: "Monitorização HRV",          href: "/services/hrv-recovery-monitoring" },
                    { icon: Zap,         en: "Advanced Electrotherapy",    pt: "Eletroterapia Avançada",     href: "/services/electrotherapy" },
                    { icon: Zap,         en: "Microcurrent (MENS)",        pt: "Microcorrente (MENS)",       href: "/services/microcurrent" },
                    { icon: Waves,       en: "Therapeutic Ultrasound",     pt: "Ultrassom Terapêutico",      href: "/services/therapeutic-ultrasound" },
                    { icon: Cpu,         en: "Biohacking & Performance",   pt: "Biohacking & Performance",   href: "/services/biohacking-performance" },
                  ] as const).map((t) => (
                    <Link key={t.en} href={t.href} className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-primary hover:border-primary/30 hover:shadow-sm transition-all">
                      <t.icon className="h-3 w-3 shrink-0" />
                      <span>{locale === "pt-BR" ? t.pt : t.en}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* ═══ DIFFERENTIATORS ═══ */}
      <section className="py-16 sm:py-20 lg:py-28 bg-slate-900 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 text-white/80 text-xs font-semibold uppercase tracking-wider mb-4">
              {locale === "pt-BR" ? "Porque somos diferentes" : "Why we are different"}
            </span>
            <h2 className="font-sora text-3xl sm:text-4xl font-bold text-white tracking-tight">
              {locale === "pt-BR"
                ? "Um nível de cuidado que poucas clínicas no mundo oferecem"
                : "A level of care that few clinics in the world offer"}
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {([
              {
                icon: Clock,
                accent: "from-amber-400 to-orange-400",
                titleEn: "No session limits",
                titlePt: "Sem limite de sessão",
                descEn: "You don't pay for hours. You invest in a complete result. Every appointment lasts as long as your treatment requires — never rushed, never cut short.",
                descPt: "Não pagas por horas. Investes num resultado completo. Cada consulta dura o tempo que o teu tratamento necessita — nunca apressado, nunca interrompido.",
              },
              {
                icon: Target,
                accent: "from-primary to-cyan-400",
                titleEn: "Root cause, not symptoms",
                titlePt: "Causa raiz, não sintomas",
                descEn: "We use thermography and HRV to understand why the problem exists — not just where it hurts. We treat the source.",
                descPt: "Usamos termografia e HRV para perceber por que o problema existe — não apenas onde dói. Tratamos a origem.",
              },
              {
                icon: Users,
                accent: "from-emerald-400 to-teal-400",
                titleEn: "Whole-person care",
                titlePt: "Cuidado integral",
                descEn: "When your recovery requires it, we work with dentists, nutritionists, and other specialists. Because your body is a system, and we treat it as one.",
                descPt: "Quando a tua recuperação o exige, trabalhamos com dentistas, nutricionistas e outros especialistas. Porque o teu corpo é um sistema e tratamo-lo como tal.",
              },
            ] as const).map((diff) => (
              <div key={diff.titleEn} className="bg-white/5 rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-all">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${diff.accent} flex items-center justify-center mb-5`}>
                  <diff.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{locale === "pt-BR" ? diff.titlePt : diff.titleEn}</h3>
                <p className="text-white/70 text-sm leading-relaxed">{locale === "pt-BR" ? diff.descPt : diff.descEn}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Articles Section */}
      <section id="articles" className="py-14 sm:py-16 lg:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 sm:mb-10">
            <p className="text-secondary font-medium mb-2">{T("home.articlesLabel")}</p>
            <h2 className="font-sora text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
              {S("articlesTitle", "home.articlesTitle")}
            </h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl">{S("articlesSubtitle", "home.articlesSubtitle")}</p>
          </div>

          {articles.length > 0 ? (
            <LazyLoadSection 
              threshold={0.1} 
              rootMargin="200px"
              fallback={
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-80 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              }
            >
              <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map((article, index) => (
                  <div key={article.slug || index}>
                    <Link href={`/articles/${article.slug}`}>
                    <Card className="h-full card-hover overflow-hidden border border-border cursor-pointer">
                      {article.imageUrl && (
                        <div className="relative aspect-video bg-muted overflow-hidden">
                          {article.imageUrl.startsWith('data:') || article.imageUrl.startsWith('/api/') ? (
                            // Internal API-served images bypass next/image (optimizer can't re-fetch them)
                            <img src={article.imageUrl} alt={article.title} loading="lazy" className="object-cover absolute inset-0 w-full h-full" />
                          ) : (
                            <Image src={article.imageUrl} alt={article.title} fill className="object-cover" loading="lazy" quality={55} sizes="(max-width: 768px) 100vw, 33vw" />
                          )}
                        </div>
                      )}
                      <CardContent className="p-4 sm:p-6">
                        <h3 className="font-semibold text-lg text-foreground mb-2 line-clamp-2">{article.title}</h3>
                        <p className="text-muted-foreground text-sm line-clamp-3 mb-4">{article.excerpt}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>By {(article as any).authorName || `${article.author.firstName} ${article.author.lastName}`}</span>
                          <span>{new Date(article.createdAt).toLocaleDateString(locale === "pt-BR" ? "pt-BR" : "en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                        </div>
                      </CardContent>
                    </Card>
                    </Link>
                  </div>
                ))}
              </div>
              <div className="text-center mt-8">
                <Link href="/articles"><Button variant="ba1Outline" className="gap-2">{T("home.articlesLabel")} <ArrowRight className="h-4 w-4" /></Button></Link>
              </div>
              </>
            </LazyLoadSection>
          ) : (
            <div className="text-center py-14 bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border border-primary/10">
              <BookOpen className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-3">{T("home.articlesComing")}</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">{T("home.articlesComingDesc")}</p>
              <Link href="/signup">
                <Button variant="ba1Primary" className="gap-2">
                  {locale === "pt-BR" ? "Começar o Programa" : "Start Your Programme"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ═══ CONTACT SECTION ═══ */}
      {(() => {
        const dayOrder = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
        const dayPt: Record<string,string> = { Sunday:"Domingo",Monday:"Segunda",Tuesday:"Terça",Wednesday:"Quarta",Thursday:"Quinta",Friday:"Sexta",Saturday:"Sábado" };
        const sortedHours = clinicSchedule.length > 0
          ? [...clinicSchedule].sort((a,b) => a.dayOfWeek - b.dayOfWeek)
          : dayOrder.map((d,i) => ({ day: d, dayOfWeek: i, open: "09:00", close: "18:00", closed: d === "Sunday" }));

        return (
          <section id="contact" className="py-16 sm:py-20 lg:py-24 bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
                  {locale === "pt-BR" ? "Fala Connosco" : "Get in Touch"}
                </span>
                <h2 className="font-sora text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                  {S("contactTitle", "home.contactTitle")}
                </h2>
                <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                  {S("contactSubtitle", "home.contactSubtitle")}
                </p>
              </div>

              <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start max-w-5xl mx-auto">

                {/* Contact info cards */}
                <div className="space-y-4">
                  {settings?.address && (
                    <div className="flex items-start gap-4 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">{locale === "pt-BR" ? "Localização" : "Location"}</p>
                        <p className="text-sm font-medium text-foreground">{settings.address}</p>
                      </div>
                    </div>
                  )}
                  {settings?.phone && (
                    <a href={`tel:${settings.phone}`} className="flex items-start gap-4 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:border-primary/20 hover:shadow-md transition-all block">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Phone className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">{locale === "pt-BR" ? "Telefone" : "Phone"}</p>
                        <p className="text-sm font-medium text-foreground">{settings.phone}</p>
                      </div>
                    </a>
                  )}
                  {settings?.email && (
                    <a href={`mailto:${settings.email}`} className="flex items-start gap-4 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:border-primary/20 hover:shadow-md transition-all block">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Email</p>
                        <p className="text-sm font-medium text-foreground">{settings.email}</p>
                      </div>
                    </a>
                  )}
                  {settings?.whatsappEnabled && settings?.whatsappNumber && (
                    <a
                      href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g,'')}${settings.whatsappMessage ? `?text=${encodeURIComponent(settings.whatsappMessage)}` : ''}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-start gap-4 bg-[#25D366]/5 rounded-2xl p-5 border border-[#25D366]/20 shadow-sm hover:bg-[#25D366]/10 transition-all block"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#25D366]/20 flex items-center justify-center shrink-0">
                        <MessageCircle className="h-5 w-5 text-[#25D366]" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">WhatsApp</p>
                        <p className="text-sm font-medium text-foreground">{settings.whatsappNumber}</p>
                      </div>
                    </a>
                  )}
                  <div className="mt-6">
                    <Link href="/signup">
                      <Button size="lg" variant="ba1Primary" className="w-full gap-2">
                        {locale === "pt-BR" ? "Começar o Programa" : "Start Your Programme"} <ArrowRight className="h-5 w-5" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Opening hours */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-sm">{locale === "pt-BR" ? "Horário de Funcionamento" : "Opening Hours"}</h3>
                      <p className="text-xs text-muted-foreground">{locale === "pt-BR" ? "Actualizados em tempo real" : "Live from our system"}</p>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {sortedHours.map((h) => {
                      const isToday = new Date().toLocaleDateString("en-GB", { weekday: "long" }) === h.day;
                      return (
                        <div key={h.day} className={`flex items-center justify-between px-6 py-3 ${isToday ? "bg-primary/5" : ""}`}>
                          <div className="flex items-center gap-2">
                            {isToday && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                            <span className={`text-sm font-medium ${isToday ? "text-primary" : "text-foreground"}`}>
                              {locale === "pt-BR" ? dayPt[h.day] ?? h.day : h.day}
                              {isToday && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-primary/70">{locale === "pt-BR" ? "Hoje" : "Today"}</span>}
                            </span>
                          </div>
                          {h.closed ? (
                            <span className="text-xs text-red-400 font-medium">{locale === "pt-BR" ? "Fechado" : "Closed"}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground tabular-nums">{h.open} – {h.close}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {clinicSchedule.length === 0 && (
                    <div className="px-6 py-3 border-t border-slate-50">
                      <p className="text-xs text-muted-foreground italic text-center">
                        {locale === "pt-BR" ? "Configure os horários em Admin → Schedule → Availability" : "Set hours in Admin → Schedule → Availability"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* ═══ FOOTER ═══ */}
      {(() => {
        const fSocial: { id: string; platform: string; url: string }[] = (() => { try { return settings?.socialLinksJson ? JSON.parse(settings.socialLinksJson) : []; } catch { return []; } })();
        const dayOrder = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
        const dayPt: Record<string,string> = { Sunday:"Domingo",Monday:"Segunda",Tuesday:"Terça",Wednesday:"Quarta",Thursday:"Quinta",Friday:"Sexta",Saturday:"Sábado" };
        const sortedHours = clinicSchedule.length > 0
          ? [...clinicSchedule].sort((a,b) => a.dayOfWeek - b.dayOfWeek)
          : dayOrder.map((d,i) => ({ day: d, dayOfWeek: i, open: "09:00", close: "18:00", closed: d === "Sunday" }));
        const socialIconMap: Record<string, any> = { instagram: Instagram, facebook: Facebook, twitter: Twitter, linkedin: Linkedin, youtube: Youtube };

        return (
          <footer className="bg-[#20242D] text-white">
            {/* Main footer grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">

                {/* Col 1 — Brand */}
                <div className="lg:col-span-1">
                  {settings && (
                    <div className="mb-4">
                      <Logo logoUrl={settings.screenLogos?.landingFooter?.logoUrl || settings.logoUrl} darkLogoUrl={settings.screenLogos?.landingFooter?.darkLogoUrl || settings.darkLogoUrl} size="lg" linkTo="/" />
                    </div>
                  )}
                  <p className="text-slate-400 text-sm leading-relaxed mb-5">
                    {settings?.tagline || (locale === "pt-BR"
                      ? "Reabilitação física personalizada. A tecnologia ao serviço do teu regresso a uma vida plena."
                      : "Personalised physical rehabilitation. Technology at the service of your return to a full life.")}
                  </p>
                  {fSocial.length > 0 && (
                    <div className="flex items-center gap-3">
                      {fSocial.map(s => {
                        const SIcon = socialIconMap[s.platform.toLowerCase()] || Globe;
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
                  <div className="mt-6">
                    <NewsletterSignup isPt={locale === "pt-BR"} />
                  </div>
                </div>

                {/* Col 2 — Navigation */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-5">{locale === "pt-BR" ? "Navegação" : "Navigation"}</h4>
                  <ul className="space-y-3">
                    {[
                      { labelEn: "The Method",   labelPt: "O Método",    anchor: "method" },
                      { labelEn: "Technology",   labelPt: "Tecnologia",  anchor: "equipment" },
                      { labelEn: "About Bruno",  labelPt: "Sobre Bruno", anchor: "about" },
                      { labelEn: "Articles",     labelPt: "Artigos",     href: "/articles" },
                      { labelEn: "Beyond Pain (book)", labelPt: "Beyond Pain (livro)", href: "/beyond-pain" },
                      { labelEn: "Contact",      labelPt: "Contacto",    anchor: "contact" },
                    ].map((item) => (
                      <li key={item.labelEn}>
                        {item.href ? (
                          <Link href={item.href} className="text-slate-400 hover:text-white text-sm transition-colors">
                            {locale === "pt-BR" ? item.labelPt : item.labelEn}
                          </Link>
                        ) : (
                          <button onClick={() => scrollTo(item.anchor!)} className="text-slate-400 hover:text-white text-sm transition-colors text-left">
                            {locale === "pt-BR" ? item.labelPt : item.labelEn}
                          </button>
                        )}
                      </li>
                    ))}
                    <li className="pt-2">
                      <Link href="/signup" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
                        {locale === "pt-BR" ? "Começar o Programa" : "Start Programme"} <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Col 3 — Programmes */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-5">{locale === "pt-BR" ? "Programas" : "Programmes"}</h4>
                  <ul className="space-y-3">
                    {[
                      { labelEn: "MLS® Laser Therapy",       labelPt: "Laser MLS®",                 href: "/services/mls-laser" },
                      { labelEn: "Biohacking & Performance",  labelPt: "Biohacking & Performance",   href: "/services/biohacking-performance" },
                      { labelEn: "HRV & Recovery",            labelPt: "HRV & Recuperação",          href: "/services/hrv-recovery-monitoring" },
                      { labelEn: "Sleep & Longevity",         labelPt: "Sono & Longevidade",         href: "/services/sleep-longevity-optimisation" },
                      { labelEn: "Advanced Electrotherapy",   labelPt: "Eletroterapia Avançada",     href: "/services/electrotherapy" },
                      { labelEn: "Therapeutic Ultrasound",    labelPt: "Ultrassom Terapêutico",      href: "/services/therapeutic-ultrasound" },
                      { labelEn: "Exercise Therapy",          labelPt: "Terapia por Exercício",      href: "/services/exercise-therapy" },
                    ].map((item) => (
                      <li key={item.href}>
                        <Link href={item.href} className="text-slate-400 hover:text-white text-sm transition-colors">
                          {locale === "pt-BR" ? item.labelPt : item.labelEn}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Col 4 — Contact */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-5">{locale === "pt-BR" ? "Contacto" : "Contact"}</h4>
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
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-5">{locale === "pt-BR" ? "Horário" : "Opening Hours"}</h4>
                  <ul className="space-y-2">
                    {sortedHours.map((h) => {
                      const isToday = new Date().toLocaleDateString("en-GB", { weekday: "long" }) === h.day;
                      return (
                        <li key={h.day} className={`flex items-center justify-between text-xs ${isToday ? "text-white font-semibold" : "text-slate-400"}`}>
                          <span className="flex items-center gap-1.5">
                            {isToday && <span className="w-1 h-1 rounded-full bg-primary inline-block" />}
                            {locale === "pt-BR" ? dayPt[h.day] ?? h.day : h.day}
                          </span>
                          {h.closed ? (
                            <span className="text-red-400/70">{locale === "pt-BR" ? "Fechado" : "Closed"}</span>
                          ) : (
                            <span className="tabular-nums">{h.open} – {h.close}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {clinicSchedule.length === 0 && (
                    <p className="text-slate-600 text-xs mt-2 italic">
                      {locale === "pt-BR" ? "Configure em Admin → Schedule → Availability" : "Set in Admin → Schedule → Availability"}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="border-t border-slate-800">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  {settings?.footerText || `© ${new Date().getFullYear()} Bruno Physical Rehabilitation. ${locale === "pt-BR" ? "Todos os direitos reservados." : "All rights reserved."}`}
                </p>
                <div className="flex items-center gap-5">
                  <Link href="/login" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                    {locale === "pt-BR" ? "Portal do Paciente" : "Patient Portal"}
                  </Link>
                  <Link href="/staff-login" className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    {locale === "pt-BR" ? "Acesso Staff" : "Staff Portal"}
                  </Link>
                </div>
              </div>
            </div>
          </footer>
        );
      })()}
      <VapiVoiceWidget />
    </div>
  );
}
