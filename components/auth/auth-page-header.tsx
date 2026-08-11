"use client";

import { Logo } from "@/components/ui/logo";
import { useLocale } from "@/hooks/use-locale";

interface AuthPageHeaderProps {
  settings?: {
    logoUrl?: string | null;
    darkLogoUrl?: string | null;
    screenLogos?: { landingHeader?: { logoUrl?: string | null; darkLogoUrl?: string | null } } | null;
  } | null;
}

/**
 * Minimal, focused header for auth pages (login, staff-login, signup, forgot-password):
 * a large centered logo with a compact language toggle — no distracting nav links.
 */
export function AuthPageHeader({ settings }: AuthPageHeaderProps) {
  const { locale, toggleLocale } = useLocale();

  return (
    <div className="w-full">
      <div className="flex justify-end max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="flex items-center gap-0.5 bg-slate-100 rounded-md p-0.5">
          <button
            onClick={() => { if (locale !== "en-GB") toggleLocale(); }}
            className={`text-[10px] font-medium px-2 py-1 rounded transition-colors ${locale === "en-GB" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >EN</button>
          <button
            onClick={() => { if (locale !== "pt-BR") toggleLocale(); }}
            className={`text-[10px] font-medium px-2 py-1 rounded transition-colors ${locale === "pt-BR" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >PT</button>
        </div>
      </div>
      <div className="flex justify-center pt-2 pb-8 sm:pb-10" style={{ height: 64 }}>
        {settings !== undefined && settings !== null ? (
          <Logo
            logoUrl={settings?.screenLogos?.landingHeader?.logoUrl || settings?.logoUrl}
            darkLogoUrl={settings?.screenLogos?.landingHeader?.darkLogoUrl || settings?.darkLogoUrl}
            size="xl"
            linkTo="/"
            priority
          />
        ) : null}
      </div>
    </div>
  );
}

export default AuthPageHeader;
