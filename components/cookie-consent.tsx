"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Shield, Settings, X, Check, Cookie } from "lucide-react";

// ─── Consent types ───
export interface CookieConsent {
  necessary: boolean;   // Always true — session, auth, CSRF
  analytics: boolean;   // Site analytics, fingerprinting, heatmap
  marketing: boolean;   // Future: ad tracking, social pixels
  timestamp: number;
  version: string;
}

const CONSENT_KEY = "bpr_cookie_consent";
const CONSENT_VERSION = "1.0";

// ─── Public API: check consent ───
export function getConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const consent = JSON.parse(raw) as CookieConsent;
    if (consent.version !== CONSENT_VERSION) return null;
    return consent;
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent(): boolean {
  const consent = getConsent();
  return consent?.analytics === true;
}

function saveConsent(consent: CookieConsent) {
  localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  // Dispatch custom event so SiteTracker can react
  window.dispatchEvent(new CustomEvent("consent-updated", { detail: consent }));
}

// ─── Component ───
export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [marketingEnabled, setMarketingEnabled] = useState(false);

  useEffect(() => {
    // Only show if no consent has been given yet
    const consent = getConsent();
    if (!consent) {
      // Small delay so it doesn't flash on load
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptAll = useCallback(() => {
    saveConsent({
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: Date.now(),
      version: CONSENT_VERSION,
    });
    setVisible(false);
  }, []);

  const rejectNonEssential = useCallback(() => {
    saveConsent({
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: Date.now(),
      version: CONSENT_VERSION,
    });
    setVisible(false);
  }, []);

  const savePreferences = useCallback(() => {
    saveConsent({
      necessary: true,
      analytics: analyticsEnabled,
      marketing: marketingEnabled,
      timestamp: Date.now(),
      version: CONSENT_VERSION,
    });
    setVisible(false);
    setShowPreferences(false);
  }, [analyticsEnabled, marketingEnabled]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-end sm:justify-center pointer-events-none">
      {/* Backdrop when preferences open */}
      {showPreferences && (
        <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={() => setShowPreferences(false)} />
      )}

      <div className="pointer-events-auto w-full max-w-2xl mx-4 mb-4 animate-in slide-in-from-bottom-4 duration-500">
        <div className="rounded-xl border border-white/10 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Main Banner */}
          {!showPreferences ? (
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <Cookie className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm sm:text-base">We value your privacy</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                    We use cookies and similar technologies to improve your experience, analyse site traffic, 
                    and understand visitor behaviour. You can choose which categories to allow. 
                    For more details, see our{" "}
                    <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> and{" "}
                    <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link>.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                <button
                  onClick={() => setShowPreferences(true)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Manage preferences
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={rejectNonEssential}
                    className="px-4 py-2 text-xs sm:text-sm font-medium rounded-lg border border-white/10 hover:bg-white/5 transition-colors text-foreground"
                  >
                    Reject non-essential
                  </button>
                  <button
                    onClick={acceptAll}
                    className="px-4 py-2 text-xs sm:text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Accept all
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Preferences Panel */
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground text-sm sm:text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Cookie Preferences
                </h3>
                <button
                  onClick={() => setShowPreferences(false)}
                  className="p-1 rounded-md hover:bg-white/10 transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-3 mb-5">
                {/* Necessary — always on */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                  <div className="pr-4">
                    <p className="text-sm font-medium text-foreground">Strictly necessary</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Essential for the website to function. Includes authentication, security tokens, and session management.
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1 text-xs text-emerald-400">
                    <Check className="h-3.5 w-3.5" />
                    Always on
                  </div>
                </div>

                {/* Analytics */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                  <div className="pr-4">
                    <p className="text-sm font-medium text-foreground">Analytics</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Help us understand how visitors interact with our website. This includes page views, 
                      click tracking, scroll depth, and browser fingerprinting. Data is anonymised and never sold.
                    </p>
                  </div>
                  <button
                    onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                    className={`relative shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      analyticsEnabled ? "bg-primary" : "bg-white/15"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        analyticsEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Marketing */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                  <div className="pr-4">
                    <p className="text-sm font-medium text-foreground">Marketing</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Used to deliver relevant advertisements and track their effectiveness. Currently not in use.
                    </p>
                  </div>
                  <button
                    onClick={() => setMarketingEnabled(!marketingEnabled)}
                    className={`relative shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      marketingEnabled ? "bg-primary" : "bg-white/15"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        marketingEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <p className="text-[10px] text-muted-foreground">
                  Learn more in our{" "}
                  <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link>
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={rejectNonEssential}
                    className="px-4 py-2 text-xs font-medium rounded-lg border border-white/10 hover:bg-white/5 transition-colors text-foreground"
                  >
                    Reject all
                  </button>
                  <button
                    onClick={savePreferences}
                    className="px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Save preferences
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Small button to re-open cookie preferences ───
export function CookiePreferencesButton() {
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    setHasConsent(getConsent() !== null);
    const handler = () => setHasConsent(getConsent() !== null);
    window.addEventListener("consent-updated", handler);
    return () => window.removeEventListener("consent-updated", handler);
  }, []);

  if (!hasConsent) return null;

  const reopenBanner = () => {
    localStorage.removeItem(CONSENT_KEY);
    window.location.reload();
  };

  return (
    <button
      onClick={reopenBanner}
      className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
      title="Manage cookie preferences"
    >
      <Cookie className="h-3 w-3" />
      Cookie Settings
    </button>
  );
}
