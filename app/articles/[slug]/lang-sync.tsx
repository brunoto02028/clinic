"use client";

// Bridges the site-wide EN/PT header toggle to the article's per-language URLs
// (activity 12). It never translates in place and never redirects on first load
// (that would fight shareable URLs and crawlers). It navigates only on a real
// locale *transition* — i.e. the user flips the header toggle — which is robust
// under React StrictMode's double-invoked effects (an initial-value flag isn't).
// The always-visible "Ler em português / Read in English" link covers the rest.

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/hooks/use-locale";

export function ArticleLangSync({
  lang,
  enHref,
  ptHref,
}: {
  lang: "en" | "pt";
  enHref: string;
  ptHref: string | null;
}) {
  const { locale } = useLocale();
  const router = useRouter();
  const prev = useRef<string | null>(null);

  useEffect(() => {
    // Record the first locale we see (initial + post-mount localStorage sync)
    // without acting on it.
    if (prev.current === null) {
      prev.current = locale;
      return;
    }
    if (prev.current === locale) return; // no real change
    prev.current = locale;

    const pageLocale = lang === "pt" ? "pt-BR" : "en-GB";
    if (locale === pageLocale) return; // already matches the page

    const wantsPt = locale.startsWith("pt");
    if (wantsPt && lang === "en" && ptHref) router.push(ptHref);
    else if (!wantsPt && lang === "pt") router.push(enHref);
  }, [locale, lang, enHref, ptHref, router]);

  return null;
}
