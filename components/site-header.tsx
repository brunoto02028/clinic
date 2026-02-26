"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Shield, Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { useLocale } from "@/hooks/use-locale";

interface ServiceLink {
  slug: string;
  titleEn: string;
  titlePt: string;
  showInMenu: boolean;
}

interface SiteHeaderProps {
  currentPage?: "articles" | "article" | "services" | "other";
}

export function SiteHeader({ currentPage }: SiteHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [serviceLinks, setServiceLinks] = useState<ServiceLink[]>([]);
  const { locale, toggleLocale, t: T } = useLocale();
  const isPt = locale === "pt-BR";

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setSettings(d))
      .catch(() => {});
    fetch("/api/service-pages")
      .then((r) => r.ok ? r.json() : [])
      .then((pages: ServiceLink[]) => setServiceLinks(pages.filter((p) => p.showInMenu)))
      .catch(() => {});
  }, []);

  const navLinks = [
    { href: "/#insoles", label: T("home.navInsoles") },
    { href: "/#biomechanics", label: T("home.navBiomechanics") },
    { href: "/articles", label: T("home.articlesLabel") || "Articles", active: currentPage === "articles" || currentPage === "article" },
    { href: "/#about", label: T("home.about") },
    { href: "/#contact", label: T("home.contact") },
  ];

  return (
    <header className="sticky top-0 z-50 header-futuristic">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Logo
            logoUrl={settings?.screenLogos?.landingHeader?.logoUrl || settings?.logoUrl}
            darkLogoUrl={settings?.screenLogos?.landingHeader?.darkLogoUrl || settings?.darkLogoUrl}
            size="md"
          />

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-5 xl:gap-7">
            {/* Services Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setServicesOpen(true)}
              onMouseLeave={() => setServicesOpen(false)}
            >
              <Link
                href="/#services"
                className={`text-sm font-medium transition-colors whitespace-nowrap inline-flex items-center gap-1 ${
                  currentPage === "services" ? "text-primary" : "text-muted-foreground hover:text-primary"
                }`}
              >
                {T("home.services")}
                {serviceLinks.length > 0 && <ChevronDown className={`h-3 w-3 transition-transform ${servicesOpen ? "rotate-180" : ""}`} />}
              </Link>
              {servicesOpen && serviceLinks.length > 0 && (
                <div className="absolute top-full left-0 pt-2 z-50">
                  <div className="bg-card border border-border rounded-lg shadow-lg py-1 min-w-[220px] animate-in fade-in-0 zoom-in-95 duration-150">
                    <Link
                      href="/#services"
                      className="block px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                      onClick={() => setServicesOpen(false)}
                    >
                      {isPt ? "Todos os Serviços" : "All Services"}
                    </Link>
                    <div className="border-t border-border my-1" />
                    {serviceLinks.map((s) => (
                      <Link
                        key={s.slug}
                        href={`/services/${s.slug}`}
                        className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                        onClick={() => setServicesOpen(false)}
                      >
                        {isPt ? s.titlePt : s.titleEn}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors whitespace-nowrap ${
                  link.active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-2">
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
            <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
              <button onClick={() => { if (locale !== "en-GB") toggleLocale(); }}
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors ${locale === "en-GB" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
              >EN</button>
              <button onClick={() => { if (locale !== "pt-BR") toggleLocale(); }}
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors ${locale === "pt-BR" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
              >PT</button>
            </div>
            <button className="p-2 rounded-lg hover:bg-muted" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-6 w-6 text-foreground" /> : <Menu className="h-6 w-6 text-foreground" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-border animate-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col gap-1">
              {/* Services with expandable submenu */}
              <div>
                <button
                  onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
                  className="w-full text-left hover:bg-muted/50 rounded-lg px-3 py-2.5 font-medium transition-colors text-muted-foreground hover:text-primary flex items-center justify-between"
                >
                  {T("home.services")}
                  {serviceLinks.length > 0 && <ChevronDown className={`h-4 w-4 transition-transform ${mobileServicesOpen ? "rotate-180" : ""}`} />}
                </button>
                {mobileServicesOpen && serviceLinks.length > 0 && (
                  <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-primary/20 pl-3">
                    <Link
                      href="/#services"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block text-sm text-muted-foreground hover:text-primary py-1.5 transition-colors"
                    >
                      {isPt ? "Todos os Serviços" : "All Services"}
                    </Link>
                    {serviceLinks.map((s) => (
                      <Link
                        key={s.slug}
                        href={`/services/${s.slug}`}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block text-sm text-muted-foreground hover:text-primary py-1.5 transition-colors"
                      >
                        {isPt ? s.titlePt : s.titleEn}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-left hover:bg-muted/50 rounded-lg px-3 py-2.5 font-medium transition-colors ${
                    link.active ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  {link.label}
                </Link>
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
  );
}
