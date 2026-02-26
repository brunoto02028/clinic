"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { t, getLocale, setLocale } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

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

export default function LandingPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [locale, setCurrentLocale] = useState<Locale>("en-GB");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCurrentLocale(getLocale());
    fetchSettings();
    fetchArticles();
  }, []);

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
    { id: "services", label: T("home.services") },
    { id: "insoles", label: T("home.navInsoles") },
    { id: "biomechanics", label: T("home.navBiomechanics") },
    { id: "about", label: T("home.about") },
    { id: "contact", label: T("home.contact") },
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

  const features = [
    { icon: Calendar, titleKey: "home.featureBooking", descKey: "home.featureBookingDesc" },
    { icon: ClipboardList, titleKey: "home.featureRecords", descKey: "home.featureRecordsDesc" },
    { icon: Shield, titleKey: "home.featureScreening", descKey: "home.featureScreeningDesc" },
    { icon: Zap, titleKey: "home.featureAdvanced", descKey: "home.featureAdvancedDesc" },
  ];

  const services = [
    { slug: "electrotherapy", icon: Zap, titleKey: "svc.electrotherapy", descKey: "svc.electrotherapyDesc", color: "bg-amber-500/15 text-amber-400" },
    { slug: "exercise-therapy", icon: Dumbbell, titleKey: "svc.exerciseTherapy", descKey: "svc.exerciseTherapyDesc", color: "bg-emerald-500/15 text-emerald-400" },
    { slug: "custom-insoles", icon: Footprints, titleKey: "svc.footScan", descKey: "svc.footScanDesc", color: "bg-blue-500/15 text-blue-400" },
    { slug: "biomechanical-assessment", icon: ScanLine, titleKey: "svc.biomechanical", descKey: "svc.biomechanicalDesc", color: "bg-purple-500/15 text-purple-400" },
    { slug: "therapeutic-ultrasound", icon: Waves, titleKey: "svc.ultrasound", descKey: "svc.ultrasoundDesc", color: "bg-cyan-500/15 text-cyan-400" },
    { slug: "laser-shockwave", icon: CircleDot, titleKey: "svc.laserShockwave", descKey: "svc.laserShockwaveDesc", color: "bg-rose-500/15 text-rose-400" },
    { slug: "sports-injury", icon: Activity, titleKey: "svc.sportsInjury", descKey: "svc.sportsInjuryDesc", color: "bg-orange-500/15 text-orange-400" },
    { slug: "chronic-pain", icon: Heart, titleKey: "svc.chronicPain", descKey: "svc.chronicPainDesc", color: "bg-red-500/15 text-red-400" },
    { slug: "pre-post-surgery", icon: Syringe, titleKey: "svc.prePostSurgery", descKey: "svc.prePostSurgeryDesc", color: "bg-teal-500/15 text-teal-400" },
    { slug: "kinesiotherapy", icon: Users, titleKey: "svc.kinesiotherapy", descKey: "svc.kinesiotherapyDesc", color: "bg-indigo-500/15 text-indigo-400" },
    { slug: "microcurrent", icon: Zap, titleKey: "svc.microcurrent", descKey: "svc.microcurrentDesc", color: "bg-yellow-500/15 text-yellow-400" },
  ];

  const steps = [
    { num: "01", titleKey: "home.step1Title", descKey: "home.step1Desc", icon: Calendar },
    { num: "02", titleKey: "home.step2Title", descKey: "home.step2Desc", icon: ScanLine },
    { num: "03", titleKey: "home.step3Title", descKey: "home.step3Desc", icon: Brain },
    { num: "04", titleKey: "home.step4Title", descKey: "home.step4Desc", icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-background bg-grid-pattern">
      {/* Header */}
      <header className="sticky top-0 z-50 header-futuristic">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {settings ? (
              <Logo logoUrl={settings.screenLogos?.landingHeader?.logoUrl || settings.logoUrl} darkLogoUrl={settings.screenLogos?.landingHeader?.darkLogoUrl || settings.darkLogoUrl} size="md" />
            ) : (
              <div style={{ height: 40, width: 40 }} />
            )}

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-5 xl:gap-7">
              {navAnchors.map((a) => (
                <button key={a.id} onClick={() => scrollTo(a.id)} className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium whitespace-nowrap">{a.label}</button>
              ))}
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
              <Link href="/login"><Button variant="outline" className="text-foreground">{T("home.patientLogin")}</Button></Link>
              <Link href="/signup"><Button className="bg-primary hover:bg-primary/90">{T("home.getStarted")}</Button></Link>
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
                  <button key={a.id} onClick={() => scrollTo(a.id)} className="text-left text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-lg px-3 py-2.5 font-medium transition-colors">{a.label}</button>
                ))}
                <div className="flex flex-col gap-2 pt-4 border-t border-border">
                  <Link href="/login"><Button variant="outline" className="w-full">{T("home.patientLogin")}</Button></Link>
                  <Link href="/signup"><Button className="w-full">{T("home.getStarted")}</Button></Link>
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

      {/* Hero Section */}
      <section className="relative overflow-hidden py-12 sm:py-16 lg:py-24 bg-dot-pattern">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground leading-tight">
                {(() => {
                  const hasSettingsValue = locale === "en-GB" && settings?.heroTitle;
                  const raw = hasSettingsValue || T("home.heroTitle");
                  if (raw.includes("|")) {
                    const [main, highlight] = raw.split("|").map(s => s.trim());
                    return <>{main}{" "}<span className="text-primary">{highlight}</span></>;
                  }
                  // If value comes from settings (DB), render as-is — user controls the full title
                  if (hasSettingsValue) return <>{raw}</>;
                  // Only append i18n part2 when using i18n fallback
                  return <>{raw}{" "}<span className="text-primary">{T("home.heroTitle2")}</span></>;
                })()}
              </h1>
              <p className="mt-4 sm:mt-6 text-base sm:text-lg text-muted-foreground leading-relaxed">
                {S("heroSubtitle", "home.heroSubtitle")}
              </p>
              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link href="/signup">
                  <Button size="lg" className="w-full sm:w-auto gap-2">
                    {T("home.bookAppointment")}
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">{T("home.clientPortal")}</Button>
                </Link>
              </div>
              <div className="mt-8 sm:mt-10 grid grid-cols-2 gap-4 sm:flex sm:items-center sm:gap-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-secondary flex-shrink-0" />
                  <span>{T("home.fullyInsured")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-secondary flex-shrink-0" />
                  <span>{T("home.openEveryDay")}</span>
                </div>
                <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                  <MapPin className="h-5 w-5 text-secondary flex-shrink-0" />
                  <span>Richmond TW10 6AQ</span>
                </div>
              </div>
            </div>
            <div>
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl shadow-cyan-500/10 neon-border bg-primary/10">
                {settings !== null && settings?.heroImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={settings.heroImageUrl}
                    alt="Professional physiotherapy treatment session"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="absolute -bottom-4 -left-4 sm:-bottom-6 sm:-left-6 bg-card rounded-xl p-3 sm:p-4 shadow-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-secondary/20 flex items-center justify-center">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6 text-secondary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">15+</p>
                    <p className="text-sm text-muted-foreground">{T("home.experience")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Accreditation / Trust Bar */}
      <section className="py-6 sm:py-8 border-y border-border/40 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">{T("home.accreditedMember")}</p>
            <div className="flex items-center gap-6">
              <a href="https://www.sportstherapyorganisation.net/" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 px-4 py-2 rounded-xl bg-background/80 border border-border/50 hover:border-primary/30 hover:shadow-md transition-all duration-300">
                <img src="/uploads/sto-member-badge.png" alt="Sports Therapy Organisation - Registered Member" className="h-12 w-12 sm:h-14 sm:w-14 object-contain" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Sports Therapy Organisation</p>
                  <p className="text-xs text-muted-foreground">{T("home.stoTagline")}</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Portal Features Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
              {(() => {
                const raw = S("portalTitle", "home.portalTitle");
                if (raw.includes("|")) {
                  const [main, highlight] = raw.split("|").map(s => s.trim());
                  return <>{main}{" "}<span className="text-primary">{highlight}</span></>;
                }
                // Legacy: try to highlight "Rehabilitation" / "Reabilitação"
                const keyword = locale === "pt-BR" ? "Reabilitação" : "Rehabilitation";
                if (raw.includes(keyword)) {
                  const parts = raw.split(keyword);
                  return <>{parts[0]}<span className="text-primary">{keyword}</span>{parts[1] || ""}</>;
                }
                return raw;
              })()}
            </h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl">{S("portalSubtitle", "home.portalSubtitle")}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {features.map((feature, index) => (
              <div key={feature.titleKey}>
                <Card className="h-full card-hover border-0 bg-muted/50">
                  <CardContent className="p-4 sm:p-6">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3 sm:mb-4">
                      <feature.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-base sm:text-lg text-foreground mb-2">{T(feature.titleKey)}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{T(feature.descKey)}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
          <div className="mt-8 sm:mt-10 text-center">
            <Link href="/signup"><Button size="lg" className="gap-2">{T("home.getStarted")} <ArrowRight className="h-5 w-5" /></Button></Link>
          </div>
        </div>
      </section>

      {/* Services Section — restructured with individual service cards linking to detail pages */}
      <section id="services" className="py-12 sm:py-16 lg:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">{S("servicesTitle", "home.servicesTitle")}</h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl">{S("servicesSubtitle", "home.servicesSubtitle")}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {services.map((svc, index) => (
              <div key={svc.slug}>
                <Link href={svc.slug === "custom-insoles" ? "/custom-insoles" : svc.slug === "biomechanical-assessment" ? "/biomechanical-assessment" : `/services/${svc.slug}`}>
                  <Card className="h-full group hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer border border-border bg-card">
                    <CardContent className="p-5 sm:p-6">
                      <div className="flex items-start gap-4">
                        <div className={`w-11 h-11 rounded-xl ${svc.color} flex items-center justify-center shrink-0`}>
                          <svc.icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground mb-1.5 group-hover:text-primary transition-colors">{T(svc.titleKey)}</h3>
                          <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">{T(svc.descKey)}</p>
                          <span className="inline-flex items-center gap-1 text-xs text-primary font-medium mt-3 group-hover:gap-2 transition-all">
                            {T("home.learnMore")} <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CUSTOM INSOLES / FOOT SCAN BLOCK ═══ */}
      <section id="insoles" className="py-16 sm:py-20 lg:py-28 bg-card/50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div>
            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-500/15 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4">{T("home.insolesLabel")}</span>
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-foreground leading-tight">
              {S("insolesTitle", "home.insolesTitle")} <span className="text-primary">{S("insolesSubtitle", "home.insolesTitle2")}</span>
            </h2>
          </div>

          {/* Hero row: image + description */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center mb-14 sm:mb-20">
            <div>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-[4/3]">
                {settings !== null && settings?.insolesImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={settings.insolesImageUrl} alt="Custom insoles digital foot pressure scan - Bruno Physical Rehabilitation" className="absolute inset-0 w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center gap-2 glass rounded-lg px-4 py-2.5 shadow-lg">
                    <Footprints className="h-5 w-5 text-blue-400" />
                    <span className="text-sm font-medium text-foreground">{T("home.insolesBenefit5")}</span>
                  </div>
                </div>
              </div>
              {/* floating stat */}
              <div className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 bg-card rounded-xl p-3 sm:p-4 shadow-lg border border-border">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">100%</p>
                  <p className="text-xs text-muted-foreground">Custom</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-6">{S("insolesDesc", "home.insolesDesc")}</p>
              {/* Benefits grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{T(`home.insolesBenefit${n}`)}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/signup"><Button size="lg" className="gap-2">{T("home.insolesOrderCta")} <ArrowRight className="h-4 w-4" /></Button></Link>
                <Link href="/custom-insoles"><Button size="lg" variant="outline">{T("home.insolesLearnMore")}</Button></Link>
              </div>
            </div>
          </div>

          {/* Process steps */}
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-foreground text-center mb-8">{T("home.processTitle")}</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { num: "01", titleKey: "home.insolesStep1", descKey: "home.insolesStep1Desc", icon: Footprints, color: "bg-blue-500/15 text-blue-400" },
                { num: "02", titleKey: "home.insolesStep2", descKey: "home.insolesStep2Desc", icon: Activity, color: "bg-indigo-500/15 text-indigo-400" },
                { num: "03", titleKey: "home.insolesStep3", descKey: "home.insolesStep3Desc", icon: Zap, color: "bg-violet-500/15 text-violet-400" },
                { num: "04", titleKey: "home.insolesStep4", descKey: "home.insolesStep4Desc", icon: CheckCircle2, color: "bg-emerald-500/15 text-emerald-400" },
              ].map((step, i) => (
                <div key={step.titleKey}>
                  <span className="absolute -top-3 left-5 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-sm">{step.num}</span>
                  <div className={`w-10 h-10 rounded-lg ${step.color} flex items-center justify-center mb-3 mt-1`}>
                    <step.icon className="h-5 w-5" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-1.5">{T(step.titleKey)}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{T(step.descKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ BIOMECHANICAL ASSESSMENT BLOCK ═══ */}
      <section id="biomechanics" className="py-16 sm:py-20 lg:py-28 bg-background overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div>
            <span className="inline-block px-4 py-1.5 rounded-full bg-purple-500/15 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-4">{T("home.bioLabel")}</span>
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-foreground leading-tight">
              {S("bioTitle", "home.bioTitle")} — <span className="text-primary">{S("bioSubtitle", "home.bioTitle2")}</span>
            </h2>
          </div>

          {/* Hero row: description + image (reversed) */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center mb-14 sm:mb-20">
            <div>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-6">{S("bioDesc", "home.bioDesc")}</p>
              {/* Benefits grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{T(`home.bioBenefit${n}`)}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/signup"><Button size="lg" className="gap-2">{T("home.bioOrderCta")} <ArrowRight className="h-4 w-4" /></Button></Link>
                <Link href="/biomechanical-assessment"><Button size="lg" variant="outline">{T("home.bioLearnMore")}</Button></Link>
              </div>
            </div>

            <div>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-[4/3]">
                {settings !== null && settings?.bioImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={settings.bioImageUrl} alt="Biomechanical posture assessment - Bruno Physical Rehabilitation" className="absolute inset-0 w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center gap-2 glass rounded-lg px-4 py-2.5 shadow-lg">
                    <ScanLine className="h-5 w-5 text-purple-400" />
                    <span className="text-sm font-medium text-foreground">{T("home.bioBenefit5")}</span>
                  </div>
                </div>
              </div>
              {/* floating stat */}
              <div className="absolute -top-4 -left-4 sm:-top-6 sm:-left-6 bg-card rounded-xl p-3 sm:p-4 shadow-lg border border-border">
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-400">33</p>
                  <p className="text-xs text-muted-foreground">Landmarks</p>
                </div>
              </div>
              <div className="absolute -bottom-3 -right-3 sm:-bottom-5 sm:-right-5 bg-card rounded-xl p-3 sm:p-4 shadow-lg border border-border">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">100%</p>
                  <p className="text-xs text-muted-foreground">Precision</p>
                </div>
              </div>
            </div>
          </div>

          {/* Process steps */}
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-foreground text-center mb-8">{T("home.processTitle")}</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { num: "01", titleKey: "home.bioStep1", descKey: "home.bioStep1Desc", icon: ScanLine, color: "bg-purple-500/15 text-purple-400" },
                { num: "02", titleKey: "home.bioStep2", descKey: "home.bioStep2Desc", icon: Brain, color: "bg-indigo-500/15 text-indigo-400" },
                { num: "03", titleKey: "home.bioStep3", descKey: "home.bioStep3Desc", icon: Activity, color: "bg-blue-500/15 text-blue-400" },
                { num: "04", titleKey: "home.bioStep4", descKey: "home.bioStep4Desc", icon: CheckCircle2, color: "bg-emerald-500/15 text-emerald-400" },
              ].map((step, i) => (
                <div key={step.titleKey}>
                  <span className="absolute -top-3 left-5 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-sm">{step.num}</span>
                  <div className={`w-10 h-10 rounded-lg ${step.color} flex items-center justify-center mb-3 mt-1`}>
                    <step.icon className="h-5 w-5" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-1.5">{T(step.titleKey)}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{T(step.descKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 sm:py-16 lg:py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">{T("home.howItWorksTitle")}</h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl">{T("home.howItWorksSubtitle")}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {steps.map((step, index) => (
              <div key={step.titleKey || index}>
                <div className="relative mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <step.icon className="h-7 w-7 text-primary" />
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{step.num}</span>
                </div>
                <h3 className="font-semibold text-foreground mb-2">{T(step.titleKey)}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{T(step.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-12 sm:py-16 lg:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4 sm:mb-6">
                {(() => {
                  const raw = S("aboutTitle", "home.aboutTitle");
                  if (raw.includes("|")) {
                    const [main, highlight] = raw.split("|").map(s => s.trim());
                    return <><span className="text-secondary">{main}</span>{" "}{highlight}</>;
                  }
                  return <><span className="text-secondary">Bruno Physical</span>{" "}Rehabilitation</>;
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
              <div className="mt-6 sm:mt-8">
                <Link href="/signup">
                  <Button className="gap-2">{T("home.bookConsultation")}<ArrowRight className="h-4 w-4" /></Button>
                </Link>
              </div>
            </div>
            <div>
              <div className="relative aspect-square max-w-md mx-auto lg:max-w-none rounded-2xl overflow-hidden shadow-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {settings !== null && settings?.aboutImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={settings.aboutImageUrl}
                    alt="Bruno - Physical Rehabilitation Therapist"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Articles Section */}
      <section id="articles" className="py-12 sm:py-16 lg:py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 sm:mb-10">
            <p className="text-secondary font-medium mb-2">{T("home.articlesLabel")}</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
              {S("articlesTitle", "home.articlesTitle")}
            </h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl">{S("articlesSubtitle", "home.articlesSubtitle")}</p>
          </div>

          {articles.length > 0 ? (
            <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article, index) => (
                <div key={article.slug || index}>
                  <Link href={`/articles/${article.slug}`}>
                  <Card className="h-full card-hover overflow-hidden border border-border cursor-pointer">
                    {article.imageUrl && (
                      <div className="relative aspect-video bg-muted overflow-hidden">
                        <img src={article.imageUrl} alt={article.title} className="absolute inset-0 w-full h-full object-cover" />
                      </div>
                    )}
                    <CardContent className="p-4 sm:p-6">
                      <h3 className="font-semibold text-lg text-foreground mb-2 line-clamp-2">{article.title}</h3>
                      <p className="text-muted-foreground text-sm line-clamp-3 mb-4">{article.excerpt}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>By {article.author.firstName} {article.author.lastName}</span>
                        <span>{new Date(article.createdAt).toLocaleDateString(locale === "pt-BR" ? "pt-BR" : "en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                      </div>
                    </CardContent>
                  </Card>
                  </Link>
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link href="/articles"><Button variant="outline" className="gap-2">{T("home.articlesLabel")} <ArrowRight className="h-4 w-4" /></Button></Link>
            </div>
            </>
          ) : (
            <div className="text-center py-12 bg-background rounded-2xl border border-border">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">{T("home.articlesComing")}</h3>
              <p className="text-muted-foreground">{T("home.articlesComingDesc")}</p>
            </div>
          )}
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-12 sm:py-16 lg:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">{S("contactTitle", "home.contactTitle")}</h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl">{S("contactSubtitle", "home.contactSubtitle")}</p>
          </div>
          {(() => {
            const allCards: {id:string;icon:string;title:string;content:string;enabled?:boolean;link?:string}[] = settings?.contactCardsJson ? (() => { try { return JSON.parse(settings.contactCardsJson); } catch { return []; }})() : [
              { id: '1', icon: 'MapPin', title: 'Location', content: settings?.address || 'Ipswich, Suffolk', enabled: true },
              { id: '2', icon: 'Clock', title: 'Hours', content: 'Open every day including weekends', enabled: true },
              ...(settings?.email ? [{ id: '3', icon: 'Mail', title: 'Email', content: settings.email, enabled: true, link: `mailto:${settings.email}` }] : []),
              ...(settings?.phone ? [{ id: '4', icon: 'Phone', title: 'Phone', content: settings.phone, enabled: true, link: `tel:${settings.phone}` }] : []),
              ...(settings?.whatsappEnabled && settings?.whatsappNumber ? [{ id: '5', icon: 'MessageCircle', title: 'WhatsApp', content: settings.whatsappNumber, enabled: true, link: `https://wa.me/${settings.whatsappNumber.replace(/\D/g,'')}` }] : []),
            ];
            const cards = allCards.filter(c => c.enabled !== false);
            const iconMap: Record<string,any> = { MapPin, Clock, Mail, Phone, Heart, Activity, MessageCircle };
            return (
              <div className={`grid sm:grid-cols-2 lg:grid-cols-${Math.min(cards.length, 4)} gap-4 sm:gap-6 max-w-5xl mx-auto`}>
                {cards.map((card) => {
                  const Icon = iconMap[card.icon] || MapPin;
                  const inner = (
                    <Card key={card.id} className="card-hover border-0 bg-card shadow-sm h-full">
                      <CardContent className="p-4 sm:p-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-4"><Icon className="h-6 w-6 text-secondary" /></div>
                        <h3 className="font-semibold text-foreground mb-3">{card.title}</h3>
                        <p className="text-muted-foreground text-sm whitespace-pre-line">{card.content}</p>
                      </CardContent>
                    </Card>
                  );
                  return card.link ? <a key={card.id} href={card.link} target={card.link.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="block">{inner}</a> : <div key={card.id}>{inner}</div>;
                })}
              </div>
            );
          })()}
          <div className="mt-8 sm:mt-12 text-center">
            <Link href="/signup"><Button size="lg" className="gap-2">{T("home.startRecovery")}<ArrowRight className="h-5 w-5" /></Button></Link>
          </div>
        </div>
      </section>

      {/* Footer — respects footerModulesJson toggles */}
      {(() => {
        const fMods: FooterModules = (() => { try { return settings?.footerModulesJson ? JSON.parse(settings.footerModulesJson) : {}; } catch { return {}; } })();
        const fShow = (k: keyof FooterModules) => fMods[k] === true;
        const fLinks: { id: string; title: string; url: string }[] = (() => { try { return settings?.footerLinksJson ? JSON.parse(settings.footerLinksJson) : []; } catch { return []; } })();
        const fSocial: { id: string; platform: string; url: string }[] = (() => { try { return settings?.socialLinksJson ? JSON.parse(settings.socialLinksJson) : []; } catch { return []; } })();
        const fHasLogo = fShow("logo");
        const fHasLinks = fShow("links") && fLinks.length > 0;
        const fHasContact = fShow("contact") && (settings?.email || settings?.phone);
        const fHasSocial = fShow("social") && fSocial.length > 0;
        const fHasCopyright = fShow("copyright");
        const fHasTopRow = fHasLogo || fHasLinks || fHasContact || fHasSocial;
        const fHasAny = fHasTopRow || fHasCopyright;
        return (
          <footer className="border-t border-white/5 py-4">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {fHasTopRow && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-3">
                  {fHasLogo && settings && (
                    <div className="flex items-center gap-3">
                      <Logo logoUrl={settings.screenLogos?.landingFooter?.logoUrl || settings.logoUrl} darkLogoUrl={settings.screenLogos?.landingFooter?.darkLogoUrl || settings.darkLogoUrl} size="sm" linkTo="/" />
                      {settings.tagline && <p className="text-xs text-muted-foreground">{settings.tagline}</p>}
                    </div>
                  )}
                  {fHasLinks && (
                    <div className="flex items-center gap-3 flex-wrap justify-center">
                      {fLinks.map(l => <a key={l.id} href={l.url} target={l.url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{l.title}</a>)}
                    </div>
                  )}
                  <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center sm:justify-end">
                    {fHasContact && settings?.email && <a href={`mailto:${settings.email}`} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"><Mail className="h-3 w-3" />{settings.email}</a>}
                    {fHasContact && settings?.phone && <a href={`tel:${settings.phone}`} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"><Phone className="h-3 w-3" />{settings.phone}</a>}
                    {fHasSocial && fSocial.map(s => <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" title={s.platform}><Globe className="h-4 w-4" /></a>)}
                  </div>
                </div>
              )}
              {fHasCopyright && (
                <div className={`flex flex-col sm:flex-row items-center justify-between gap-2 ${fHasTopRow ? "border-t border-white/5 pt-3" : ""}`}>
                  <p className="text-xs text-muted-foreground">{settings?.footerText || `© ${new Date().getFullYear()} BPR. ${T("home.allRightsReserved")}`}</p>
                  <div className="flex items-center gap-4">
                    <Link href="/staff-login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{T("home.staffPortal")}</Link>
                  </div>
                </div>
              )}
              {!fHasAny && (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} BPR.</p>
                  <Link href="/staff-login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{T("home.staffPortal")}</Link>
                </div>
              )}
            </div>
          </footer>
        );
      })()}
    </div>
  );
}
