"use client";

// Cloudflare Turnstile widget (activity 16). Explicit render so we can pipe the
// token to the parent form. Site key from NEXT_PUBLIC_TURNSTILE_SITE_KEY with a
// fallback to Cloudflare's always-pass TEST key (public) so dev/QA works without
// real keys — swap the fallback for the real public site key for production.

import { useEffect, useRef } from "react";

const TEST_SITE_KEY = "1x00000000000000000000AA"; // Cloudflare test key: always passes
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || TEST_SITE_KEY;

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
      reset: (id?: string) => void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;
function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => resolve(); // fail quietly; server verify is the real gate
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export function Turnstile({
  onToken,
  className,
  resetSignal = 0,
}: {
  onToken: (token: string | null) => void;
  className?: string;
  /** Bump this to reset the widget (e.g. after a failed submit): a Turnstile
   *  token is single-use, so a retry needs a fresh one. */
  resetSignal?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const cbRef = useRef(onToken);
  cbRef.current = onToken;
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadTurnstileScript().then(() => {
      if (cancelled || !ref.current || !window.turnstile) return;
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: SITE_KEY,
        callback: (t: string) => cbRef.current(t),
        "expired-callback": () => cbRef.current(null),
        "error-callback": () => cbRef.current(null),
      });
    });
    return () => {
      cancelled = true;
      try {
        if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      } catch {
        /* widget already gone */
      }
      // Invalidate any stale token held by the parent when this widget unmounts
      // (e.g. wizard step change), so a duplicate/expired token isn't submitted.
      cbRef.current(null);
    };
  }, []);

  // Explicit reset when the parent asks for a fresh challenge.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    try {
      if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
    } catch {
      /* nothing to reset */
    }
    cbRef.current(null);
  }, [resetSignal]);

  return <div ref={ref} className={className} />;
}
