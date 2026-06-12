"use client";

import { useEffect, useState, type ElementType } from "react";
import { useLocale } from "@/hooks/use-locale";

/** Sanitise article HTML to fix common rendering issues */
function sanitizeContent(html: string): string {
  return html.replace(/&nbsp;/g, " ").replace(/\u00A0/g, " ");
}

interface LocalizedTextProps {
  en?: string | null;
  pt?: string | null;
  /** What the server rendered (primary language) — used for the first paint to avoid hydration mismatch */
  fallback: string;
  as?: ElementType;
  className?: string;
}

/**
 * Renders text in the visitor's selected language (PT/EN) with fallback to the
 * primary/published version. Initial render matches the server (fallback) to
 * avoid hydration mismatches, then updates after mount based on the locale.
 */
export function LocalizedText({ en, pt, fallback, as: Tag = "span", className }: LocalizedTextProps) {
  const { locale } = useLocale();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const localized = locale.startsWith("pt") ? (pt || fallback) : (en || fallback);
  const value = mounted ? localized : fallback;

  return <Tag className={className}>{value}</Tag>;
}

interface LocalizedHtmlProps {
  en?: string | null;
  pt?: string | null;
  fallback: string;
  className?: string;
}

/** Same as LocalizedText but renders HTML content for the article body. */
export function LocalizedHtml({ en, pt, fallback, className }: LocalizedHtmlProps) {
  const { locale } = useLocale();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const localized = locale.startsWith("pt") ? (pt || fallback) : (en || fallback);
  const value = mounted ? localized : fallback;

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizeContent(value) }}
    />
  );
}
