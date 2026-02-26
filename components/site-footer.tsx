"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Instagram, Facebook, Linkedin, Twitter, Youtube, Globe } from "lucide-react";
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
  const show = (k: string) => mods[k] !== false; // default: visible

  // Parse footer links
  const footerLinks: FooterLink[] = (() => {
    try { return settings?.footerLinksJson ? JSON.parse(settings.footerLinksJson) : []; } catch { return []; }
  })();

  // Parse social links
  const socialLinks: SocialLink[] = (() => {
    try { return settings?.socialLinksJson ? JSON.parse(settings.socialLinksJson) : []; } catch { return []; }
  })();

  // Count visible columns
  const hasLogo = show("logo");
  const hasLinks = show("links") && footerLinks.length > 0;
  const hasContact = show("contact") && (settings?.email || settings?.phone || settings?.address);
  const hasSocial = show("social") && socialLinks.length > 0;
  const colCount = [hasLogo, hasLinks, hasContact || hasSocial].filter(Boolean).length || 1;

  return (
    <footer className="border-t border-white/5 py-4 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {hasLogo && settings && (
            <Logo
              logoUrl={settings?.screenLogos?.landingFooter?.logoUrl || settings?.logoUrl}
              darkLogoUrl={settings?.screenLogos?.landingFooter?.darkLogoUrl || settings?.darkLogoUrl}
              size="sm"
              linkTo="/"
            />
          )}
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} BPR. {T("home.allRightsReserved")}
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
          {settings?.email && (
            <a href={`mailto:${settings.email}`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">{settings.email}</a>
          )}
          <Link href="/staff-login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            {T("home.staffPortal")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
