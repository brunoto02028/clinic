"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Instagram, Facebook, Linkedin, Twitter, Youtube, Globe } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { useLocale } from "@/hooks/use-locale";

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
    <footer className="bg-primary text-primary-foreground py-8 sm:py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`grid gap-8 mb-8 ${colCount === 3 ? "md:grid-cols-3" : colCount === 2 ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
          {/* Brand / Logo & Tagline */}
          {hasLogo && (
            <div>
              <Logo
                logoUrl={settings?.screenLogos?.landingFooter?.logoUrl || settings?.logoUrl}
                darkLogoUrl={settings?.screenLogos?.landingFooter?.darkLogoUrl || settings?.darkLogoUrl}
                size="sm"
                linkTo="/"
                variant="dark"
              />
              {settings?.tagline && (
                <p className="mt-3 text-sm text-primary-foreground/70 max-w-xs">{settings.tagline}</p>
              )}
            </div>
          )}

          {/* Navigation Links */}
          {hasLinks && (
            <div>
              <h4 className="font-semibold text-sm mb-3 text-primary-foreground/90">{isPt ? "Links" : "Links"}</h4>
              <nav className="flex flex-col gap-2">
                {footerLinks.map((link) => (
                  <Link key={link.id} href={link.url || "#"} className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                    {link.title}
                  </Link>
                ))}
              </nav>
            </div>
          )}

          {/* Contact Info + Social */}
          {(hasContact || hasSocial) && (
            <div>
              {hasContact && (
                <>
                  <h4 className="font-semibold text-sm mb-3 text-primary-foreground/90">{T("home.contact")}</h4>
                  <div className="flex flex-col gap-2 text-sm text-primary-foreground/70">
                    {settings?.email && (
                      <a href={`mailto:${settings.email}`} className="hover:text-primary-foreground transition-colors">{settings.email}</a>
                    )}
                    {settings?.phone && (
                      <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="hover:text-primary-foreground transition-colors">{settings.phone}</a>
                    )}
                    {settings?.address && <span>{settings.address}</span>}
                  </div>
                </>
              )}
              {hasSocial && (
                <div className={hasContact ? "mt-4" : ""}>
                  <div className="flex items-center gap-3">
                    {socialLinks.map((s) => {
                      const IconComp = SOCIAL_ICONS[s.platform.toLowerCase()] || Globe;
                      return (
                        <a
                          key={s.id}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors"
                          title={s.platform}
                        >
                          <IconComp className="h-4 w-4 text-primary-foreground/80" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="mt-4">
                <Link href="/staff-login" className="text-sm text-primary-foreground/50 hover:text-primary-foreground transition-colors">
                  {T("home.staffPortal")}
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Copyright bar */}
        {show("copyright") && (
          <div className="border-t border-primary-foreground/20 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-primary-foreground/60 text-center md:text-left">
              {settings?.footerText || `© ${new Date().getFullYear()} Bruno Physical Rehabilitation. ${T("home.allRightsReserved")}`}
            </p>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors">
                {T("home.patientLogin")}
              </Link>
              <Link href="/signup" className="text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors">
                {T("home.getStarted")}
              </Link>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}
