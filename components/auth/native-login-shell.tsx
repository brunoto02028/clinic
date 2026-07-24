"use client";

import { ReactNode, useState, useEffect } from "react";
import { LocaleToggle } from "@/components/locale-toggle";

interface NativeLoginShellProps {
  children: ReactNode;   // Login form — shown in native app
  webShell: ReactNode;   // Full web layout — shown on browser
}

/**
 * Detects if running in Capacitor native app.
 * - Native: Shows clean app login (logo + form, no site header/footer)
 * - Web: Shows the full website layout with header/footer
 */
export function NativeLoginShell({ children, webShell }: NativeLoginShellProps) {
  const [isNative, setIsNative] = useState(false);
  const [checked, setChecked] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const w = window as any;
    const native =
      !!w.Capacitor?.isNativePlatform?.() ||
      document.documentElement.classList.contains("native-app");
    setIsNative(native);
    setChecked(true);

    // Fetch system logo for native shell
    if (native) {
      fetch("/api/settings")
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (!d) return;
          const url =
            d?.screenLogos?.landingHeader?.darkLogoUrl ||
            d?.darkLogoUrl ||
            d?.screenLogos?.landingHeader?.logoUrl ||
            d?.logoUrl ||
            null;
          setLogoUrl(url);
        })
        .catch(() => {});
    }
  }, []);

  // Before detection, render nothing to avoid flash
  if (!checked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Web: return normal website layout
  if (!isNative) return <>{webShell}</>;

  // Native: clean app-like login
  return (
    <div className="min-h-screen bg-background bg-grid-pattern flex flex-col pt-[env(safe-area-inset-top)]">
      {/* App-style header with logo */}
      <div className="flex flex-col items-center pt-10 pb-4 px-6">
        <div className="h-14 w-40 relative mb-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="BPR Rehab"
              className="h-full w-full object-contain"
              loading="eager"
              decoding="async"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="text-2xl font-bold text-primary tracking-wide">BPR</span>
            </div>
          )}
        </div>
        <LocaleToggle />
      </div>

      {/* Login form — centered, full width */}
      <main className="flex-1 flex items-start justify-center px-4 pb-8">
        {children}
      </main>

      {/* Minimal footer */}
      <div className="pb-[env(safe-area-inset-bottom)] px-4 py-3 text-center">
        <p className="text-[11px] text-muted-foreground/50">
          BPR Rehab &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
