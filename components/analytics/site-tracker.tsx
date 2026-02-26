"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { hasAnalyticsConsent } from "@/components/cookie-consent";

// ─── Lightweight browser fingerprint (no external deps) ───
function generateFingerprint(): string {
  const nav = navigator;
  const screen = window.screen;
  const parts = [
    nav.userAgent,
    nav.language,
    screen.width + "x" + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    nav.hardwareConcurrency || "",
    (nav as any).deviceMemory || "",
    nav.maxTouchPoints || 0,
    // Canvas fingerprint
    (() => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return "";
        ctx.textBaseline = "top";
        ctx.font = "14px Arial";
        ctx.fillText("fp", 2, 2);
        return canvas.toDataURL().slice(-50);
      } catch {
        return "";
      }
    })(),
  ].join("|");

  // Simple hash
  let hash = 0;
  for (let i = 0; i < parts.length; i++) {
    const char = parts.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return "fp_" + Math.abs(hash).toString(36) + "_" + parts.length;
}

// ─── CSS selector builder ───
function getSelector(el: Element): string {
  if (el.id) return `#${el.id}`;
  const tag = el.tagName.toLowerCase();
  const classes = Array.from(el.classList).slice(0, 3).join(".");
  const parent = el.parentElement;
  if (!parent) return tag;
  const siblings = Array.from(parent.children).filter(c => c.tagName === el.tagName);
  const idx = siblings.indexOf(el);
  const base = classes ? `${tag}.${classes}` : tag;
  return siblings.length > 1 ? `${base}:nth-child(${idx + 1})` : base;
}

// ─── UTM extractor ───
function getUtmParams(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach(k => {
    const v = params.get(k);
    if (v) utm[k.replace("utm_", "utmS").replace("_s", "S").replace("utm_", "")] = v;
  });
  // Simpler approach
  const utmSource = params.get("utm_source");
  const utmMedium = params.get("utm_medium");
  const utmCampaign = params.get("utm_campaign");
  const utmTerm = params.get("utm_term");
  const utmContent = params.get("utm_content");
  return {
    ...(utmSource && { utmSource }),
    ...(utmMedium && { utmMedium }),
    ...(utmCampaign && { utmCampaign }),
    ...(utmTerm && { utmTerm }),
    ...(utmContent && { utmContent }),
  };
}

// ─── Device type detector ───
function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobile|iphone|android.*mobile/i.test(ua)) return "mobile";
  return "desktop";
}

// ─── Browser detector ───
function getBrowserInfo(): { browser: string; browserVersion: string } {
  const ua = navigator.userAgent;
  let browser = "Unknown";
  let browserVersion = "";

  if (ua.includes("Firefox/")) {
    browser = "Firefox";
    browserVersion = ua.split("Firefox/")[1]?.split(" ")[0] || "";
  } else if (ua.includes("Edg/")) {
    browser = "Edge";
    browserVersion = ua.split("Edg/")[1]?.split(" ")[0] || "";
  } else if (ua.includes("Chrome/")) {
    browser = "Chrome";
    browserVersion = ua.split("Chrome/")[1]?.split(" ")[0] || "";
  } else if (ua.includes("Safari/") && !ua.includes("Chrome")) {
    browser = "Safari";
    browserVersion = ua.split("Version/")[1]?.split(" ")[0] || "";
  }

  return { browser, browserVersion };
}

// ─── OS detector ───
function getOsInfo(): { os: string; osVersion: string } {
  const ua = navigator.userAgent;
  let os = "Unknown";
  let osVersion = "";

  if (ua.includes("Windows NT")) {
    os = "Windows";
    const v = ua.match(/Windows NT (\d+\.\d+)/);
    osVersion = v ? v[1] : "";
  } else if (ua.includes("Mac OS X")) {
    os = "macOS";
    const v = ua.match(/Mac OS X (\d+[._]\d+)/);
    osVersion = v ? v[1].replace(/_/g, ".") : "";
  } else if (ua.includes("Android")) {
    os = "Android";
    const v = ua.match(/Android (\d+\.?\d*)/);
    osVersion = v ? v[1] : "";
  } else if (/iPhone|iPad/.test(ua)) {
    os = "iOS";
    const v = ua.match(/OS (\d+_\d+)/);
    osVersion = v ? v[1].replace(/_/g, ".") : "";
  } else if (ua.includes("Linux")) {
    os = "Linux";
  }

  return { os, osVersion };
}

// ─── Send beacon ───
function sendEvent(type: string, data: Record<string, any>) {
  const payload = JSON.stringify({ type, ...data, timestamp: Date.now() });
  
  // Use sendBeacon for reliability (works even on page unload)
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/analytics/track", payload);
  } else {
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }
}

// ─── Throttle helper ───
function throttle<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let last = 0;
  return ((...args: any[]) => {
    const now = Date.now();
    if (now - last >= delay) {
      last = now;
      return fn(...args);
    }
  }) as T;
}

export function SiteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageViewIdRef = useRef<string | null>(null);
  const enteredAtRef = useRef<number>(Date.now());
  const maxScrollRef = useRef<number>(0);
  const fingerprintRef = useRef<string>("");
  const sessionIdRef = useRef<string>("");
  const isFirstPageRef = useRef<boolean>(true);
  const [consentGiven, setConsentGiven] = useState(false);

  // Listen for consent changes
  useEffect(() => {
    setConsentGiven(hasAnalyticsConsent());
    const handler = () => setConsentGiven(hasAnalyticsConsent());
    window.addEventListener("consent-updated", handler);
    return () => window.removeEventListener("consent-updated", handler);
  }, []);

  // Generate session ID once (only after consent)
  useEffect(() => {
    if (!consentGiven) return;
    if (!sessionIdRef.current) {
      sessionIdRef.current = "s_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }
    if (!fingerprintRef.current) {
      fingerprintRef.current = generateFingerprint();
    }
  }, [consentGiven]);

  // ─── Page View tracking ───
  useEffect(() => {
    if (!consentGiven) return;
    if (!fingerprintRef.current) {
      fingerprintRef.current = generateFingerprint();
    }

    // Send exit event for previous page
    if (pageViewIdRef.current) {
      const timeOnPage = Math.round((Date.now() - enteredAtRef.current) / 1000);
      sendEvent("page_exit", {
        pageViewId: pageViewIdRef.current,
        timeOnPage,
        scrollDepthMax: maxScrollRef.current,
      });
    }

    // Reset for new page
    const pvId = "pv_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    pageViewIdRef.current = pvId;
    enteredAtRef.current = Date.now();
    maxScrollRef.current = 0;

    const { browser, browserVersion } = getBrowserInfo();
    const { os, osVersion } = getOsInfo();
    const utmParams = getUtmParams();

    sendEvent("page_view", {
      pageViewId: pvId,
      sessionId: sessionIdRef.current,
      fingerprint: fingerprintRef.current,
      url: window.location.href,
      path: pathname,
      title: document.title,
      queryParams: searchParams?.toString() || "",
      referrer: document.referrer,
      isEntryPage: isFirstPageRef.current,
      // Device info (sent with first page view, server deduplicates)
      userAgent: navigator.userAgent,
      browser,
      browserVersion,
      os,
      osVersion,
      deviceType: getDeviceType(),
      screenWidth: screen.width,
      screenHeight: screen.height,
      language: navigator.language,
      ...utmParams,
    });

    isFirstPageRef.current = false;
  }, [pathname, searchParams, consentGiven]);

  // ─── Scroll depth tracking ───
  useEffect(() => {
    if (!consentGiven) return;
    const handleScroll = throttle(() => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        const depth = Math.round((scrollTop / docHeight) * 100);
        if (depth > maxScrollRef.current) {
          maxScrollRef.current = depth;
        }
      }
    }, 500);

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [consentGiven]);

  // ─── Click tracking ───
  const handleClick = useCallback((e: MouseEvent) => {
    if (!consentGiven) return;
    const target = e.target as Element;
    if (!target) return;

    // Skip if inside admin/dashboard
    if (pathname?.startsWith("/admin") || pathname?.startsWith("/dashboard")) return;

    const rect = document.documentElement;
    const x = (e.pageX / rect.scrollWidth) * 100; // percentage of page width
    const y = e.pageY; // absolute Y in pixels

    const elementTag = target.tagName?.toLowerCase() || "";
    const elementText = (target.textContent || "").trim().slice(0, 100);
    const elementHref = (target as HTMLAnchorElement).href || 
      target.closest("a")?.href || "";

    sendEvent("click", {
      pageViewId: pageViewIdRef.current,
      fingerprint: fingerprintRef.current,
      pagePath: pathname,
      x: Math.round(x * 100) / 100,
      y: Math.round(y),
      pageWidth: rect.scrollWidth,
      pageHeight: rect.scrollHeight,
      viewportHeight: window.innerHeight,
      selector: getSelector(target),
      elementTag,
      elementText,
      elementHref,
    });

    // Auto-detect conversions
    const isWhatsApp = elementHref.includes("wa.me") || elementHref.includes("whatsapp");
    const isPhone = elementHref.startsWith("tel:");
    const isBooking = elementHref.includes("/book") || elementHref.includes("/appointment");
    const isCTA = target.closest("button[data-conversion]") || target.closest("a[data-conversion]");

    if (isWhatsApp || isPhone || isBooking || isCTA) {
      sendEvent("conversion", {
        fingerprint: fingerprintRef.current,
        type: isWhatsApp ? "whatsapp_click" : isPhone ? "phone_call" : isBooking ? "booking_start" : "cta_click",
        label: isWhatsApp ? "WhatsApp" : isPhone ? "Phone Call" : isBooking ? "Book Appointment" : elementText,
        pagePath: pathname,
        elementSelector: getSelector(target),
      });
    }
  }, [pathname, consentGiven]);

  useEffect(() => {
    if (!consentGiven) return;
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [handleClick, consentGiven]);

  // ─── Page exit on unload ───
  useEffect(() => {
    if (!consentGiven) return;
    const handleBeforeUnload = () => {
      if (pageViewIdRef.current) {
        const timeOnPage = Math.round((Date.now() - enteredAtRef.current) / 1000);
        sendEvent("page_exit", {
          pageViewId: pageViewIdRef.current,
          timeOnPage,
          scrollDepthMax: maxScrollRef.current,
          isExitPage: true,
        });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [consentGiven]);

  // ─── Form submission conversion tracking ───
  useEffect(() => {
    if (!consentGiven) return;
    const handleSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement;
      if (!form) return;
      sendEvent("conversion", {
        fingerprint: fingerprintRef.current,
        type: "form_submit",
        label: form.getAttribute("data-conversion-label") || form.action || "Form Submit",
        pagePath: pathname,
        elementSelector: form.id ? `#${form.id}` : "form",
      });
    };

    document.addEventListener("submit", handleSubmit, true);
    return () => document.removeEventListener("submit", handleSubmit, true);
  }, [pathname, consentGiven]);

  // No visual output
  return null;
}
