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

interface LanguageFallbackNoticeProps {
  hasEn: boolean;
  hasPt: boolean;
}

/**
 * The site's PT/EN toggle only switches between versions that exist. On an
 * article that was never translated the toggle appears to do nothing, because
 * every field silently falls back to the published language — this says so.
 */
export function LanguageFallbackNotice({ hasEn, hasPt }: LanguageFallbackNoticeProps) {
  const { locale } = useLocale();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const wantsPt = locale.startsWith("pt");
  if (wantsPt ? hasPt : hasEn) return null;

  return (
    <p className="text-sm text-muted-foreground bg-muted/50 border border-border rounded-lg px-4 py-3 mb-8">
      {wantsPt
        ? "Este artigo ainda não está disponível em português — exibindo a versão em inglês."
        : "This article isn't available in English yet — showing the Portuguese version."}
    </p>
  );
}
