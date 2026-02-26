"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Instagram, Facebook, Linkedin, Twitter, Youtube, Globe, Mail, Phone } from "lucide-react";
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

interface FooterLink { id: string; title: string; url: string }
interface SocialLink { id: string; platform: string; url: string }

export function SiteFooter() {
  const { locale, t: T } = useLocale();
  const isPt = locale === "pt-BR";
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setSettings(d))
      .catch(() => {});
  }, []);

  // Parse footer modules (which sections are enabled)
  const mods: Record<string, boolean> = (() => {
    try { return settings?.footerModulesJson ? JSON.parse(settings.footerModulesJson) : {}; } catch { return {}; }
  })();
  const show = (k: string) => mods[k] === true;

  // Parse footer links
  const footerLinks: FooterLink[] = (() => {
    try { return settings?.footerLinksJson ? JSON.parse(settings.footerLinksJson) : []; } catch { return []; }
  })();

  // Parse social links
  const socialLinks: SocialLink[] = (() => {
    try { return settings?.socialLinksJson ? JSON.parse(settings.socialLinksJson) : []; } catch { return []; }
  })();

  const hasLogo = show("logo");
  const hasLinks = show("links") && footerLinks.length > 0;
  const hasContact = show("contact") && (settings?.email || settings?.phone || settings?.address);
  const hasSocial = show("social") && socialLinks.length > 0;
  const hasCopyright = show("copyright");

  // If no modules at all, render a minimal bar with just legal links
  const hasAnyModule = hasLogo || hasLinks || hasContact || hasSocial || hasCopyright;

  // Full footer layout (when logo, links, contact, or social are enabled)
  const hasTopRow = hasLogo || hasLinks || hasContact || hasSocial;

  return (
    <footer className="border-t border-white/5 py-4 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Top row — logo, links, contact, social */}
        {hasTopRow && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-3">
            {/* Left: Logo */}
            {hasLogo && settings && (
              <div className="flex items-center gap-3">
                <Logo
                  logoUrl={settings?.screenLogos?.landingFooter?.logoUrl || settings?.logoUrl}
                  darkLogoUrl={settings?.screenLogos?.landingFooter?.darkLogoUrl || settings?.darkLogoUrl}
                  size="sm"
                  linkTo="/"
                />
                {settings?.tagline && <p className="text-xs text-muted-foreground">{settings.tagline}</p>}
              </div>
            )}

            {/* Center: Navigation Links */}
            {hasLinks && (
              <div className="flex items-center gap-3 flex-wrap justify-center">
                {footerLinks.map(l => (
                  <a key={l.id} href={l.url} target={l.url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors">{l.title}</a>
                ))}
              </div>
            )}

            {/* Right: Contact + Social */}
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center sm:justify-end">
              {hasContact && settings?.email && (
                <a href={`mailto:${settings.email}`} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  <Mail className="h-3 w-3" />{settings.email}
                </a>
              )}
              {hasContact && settings?.phone && (
                <a href={`tel:${settings.phone}`} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  <Phone className="h-3 w-3" />{settings.phone}
                </a>
              )}
              {hasSocial && socialLinks.map(s => {
                const Icon = SOCIAL_ICONS[s.platform.toLowerCase()] || Globe;
                return (
                  <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors" title={s.platform}>
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Copyright bar */}
        {hasCopyright && (
          <div className={`flex flex-col sm:flex-row items-center justify-between gap-2 ${hasTopRow ? "border-t border-white/5 pt-3" : ""}`}>
            <div className="flex items-center gap-3">
              {/* Show logo inline with copyright if no top row but logo module is off */}
              <p className="text-xs text-muted-foreground">
                {settings?.footerText || `© ${new Date().getFullYear()} BPR. ${T("home.allRightsReserved")}`}
              </p>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center sm:justify-end">
              <Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {isPt ? "Privacidade" : "Privacy"}
              </Link>
              <Link href="/cookies" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {isPt ? "Cookies" : "Cookies"}
              </Link>
              <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {isPt ? "Termos" : "Terms"}
              </Link>
              <CookiePreferencesButton />
              <Link href="/staff-login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {T("home.staffPortal")}
              </Link>
            </div>
          </div>
        )}

        {/* If nothing is enabled at all, show absolute minimum */}
        {!hasAnyModule && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} BPR.</p>
            <div className="flex items-center gap-3">
              <Link href="/staff-login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {T("home.staffPortal")}
              </Link>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}
