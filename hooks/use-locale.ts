"use client";

import { useState, useEffect, useCallback } from "react";
import { t as translate, getLocale, setLocale as setGlobalLocale, type Locale } from "@/lib/i18n";

const LOCALE_EVENT = "clinic-locale-change";

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>("en-GB");

  useEffect(() => {
    // Sync on mount
    setLocaleState(getLocale());

    // Listen for locale changes from other components
    const handler = () => setLocaleState(getLocale());
    const storageHandler = (e: StorageEvent) => {
      if (e.key === "clinic-locale") handler();
    };
    window.addEventListener(LOCALE_EVENT, handler);
    window.addEventListener("storage", storageHandler);
    return () => {
      window.removeEventListener(LOCALE_EVENT, handler);
      window.removeEventListener("storage", storageHandler);
    };
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setGlobalLocale(newLocale);
    setLocaleState(newLocale);
    // Broadcast to all other useLocale() instances
    window.dispatchEvent(new Event(LOCALE_EVENT));
  }, []);

  const t = useCallback((key: string) => {
    return translate(key, locale);
  }, [locale]);

  const toggleLocale = useCallback(() => {
    const next = locale === "en-GB" ? "pt-BR" : "en-GB";
    setLocale(next);
  }, [locale, setLocale]);

  return { locale, setLocale, t, toggleLocale };
}
