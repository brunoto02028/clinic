"use client";

// Shared public-site header — mirrors the homepage header exactly.
import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Shield, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { useLocale } from "@/hooks/use-locale";

interface SiteHeaderProps {
  currentPage?: "articles" | "article" | "services" | "other";
  initialSettings?: any;
}

export function SiteHeader({ currentPage, initialSettings }: SiteHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settings, setSettings] = useState<any>(initialSettings || null);
  const [mounted, setMounted] = useState(false);
  const { locale, toggleLocale, t: T } = useLocale();
  const isPt = locale === "pt-BR";

  useEffect(() => {
    setMounted(true);
    if (!initialSettings) {
      fetch("/api/settings")
        .then((r) => r.ok ? r.json() : null)
        .then((d) => d && setSettings(d))
        .catch(() => {});
    }
  }, [initialSettings]);

  // Same items and order as the homepage header
  const navLinks = [
    { href: "/#method",    labelEn: "The Method",  labelPt: "O Método" },
    { href: "/#equipment", labelEn: "Technology",  labelPt: "Tecnologia" },
    { href: "/#about",     labelEn: "About",       labelPt: "Sobre" },
    { href: "/#contact",   labelEn: "Contact",     labelPt: "Contacto" },
    { href: "/articles",   labelEn: "Articles",    labelPt: "Artigos",  active: currentPage === "articles" || currentPage === "article" },
    { href: "/help",       labelEn: "Help",        labelPt: "Ajuda" },
  ];

  return (
    <>
    <header className="fixed top-0 left-0 right-0 z-50 header-futuristic site-header-web-only">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Logo
            logoUrl={settings?.screenLogos?.landingHeader?.logoUrl || settings?.logoUrl}
            darkLogoUrl={settings?.screenLogos?.landingHeader?.darkLogoUrl || settings?.darkLogoUrl}
            size="md"
            linkTo="/"
          />

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-5 xl:gap-7">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors whitespace-nowrap ${
                  link.active ? "text-primary" : "text-muted-foreground hover:text-primary"
                }`}
              >
                {isPt ? link.labelPt : link.labelEn}
              </Link>
            ))}
          </nav>

          {/* WhatsApp button in header (same as home) */}
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
                {isPt ? "Staff" : "Staff"}
              </Button>
            </Link>
            <Link href="/login"><Button variant="outline" className="text-foreground">{isPt ? "Login do Paciente" : "Patient Login"}</Button></Link>
            <Link href="/signup"><Button className="bg-primary hover:bg-primary/90">{isPt ? "Começar" : "Start Programme"}</Button></Link>
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
          <div className="lg:hidden py-4 border-t border-border animate-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-left hover:bg-muted/50 rounded-lg px-3 py-2.5 font-medium transition-colors ${
                    link.active ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  {isPt ? link.labelPt : link.labelEn}
                </Link>
              ))}
              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full">{isPt ? "Login do Paciente" : "Patient Login"}</Button>
                </Link>
                <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full">{isPt ? "Começar" : "Start Programme"}</Button>
                </Link>
                <div className="space-y-1 pt-2 border-t border-border">
                  <Link href="/staff-login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground"><Shield className="h-4 w-4 mr-2" />Staff</Button>
                  </Link>
                </div>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
    {/* Spacer for fixed header */}
    <div className="h-16 md:h-20 site-header-web-only" aria-hidden="true" />
    </>
  );
}
