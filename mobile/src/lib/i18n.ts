import { useQuery } from "@tanstack/react-query";
import { fetchProfile } from "@/api/profile";

/**
 * Which language this patient reads.
 *
 * English is the product's canonical language: every string is written in it
 * first, and Portuguese is the translation. What this decides is only which of
 * the two a given patient is shown — and that is their own `preferredLocale`,
 * the same field the web honours and the profile screen writes.
 *
 * The app used to answer this per screen, and mostly did not answer it at all:
 * fifteen screens took the Portuguese field whenever the data had one, so a
 * patient whose record said `en-GB` read Portuguese. That is what this exists
 * to stop.
 */
export type Lang = "en" | "pt";

export function localeToLang(locale: string | null | undefined): Lang {
  return String(locale ?? "").toLowerCase().startsWith("pt") ? "pt" : "en";
}

/**
 * The language to use before anyone has signed in.
 *
 * `useLang()` cannot answer on the sign-in and lock screens: it reads the
 * patient's `preferredLocale`, and there is no patient yet. The device's own
 * locale is the only honest guess.
 *
 * Read through `Intl`, which Hermes and every browser already provide, rather
 * than adding a localisation package for one string.
 */
export function deviceLang(): Lang {
  try {
    return localeToLang(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    return "en";
  }
}

/** The patient's language. Shares the `profile` query, so it costs no request. */
export function useLang(): Lang {
  const { data } = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
  return localeToLang(data?.preferredLocale);
}

/**
 * The field in the patient's language, falling back to the other.
 *
 * `pick(lang, item.title, item.titlePt)` — never `item.titlePt || item.title`,
 * which is the shape that made Portuguese win for everyone.
 *
 * The fallback is deliberate and one-directional in effect: a missing
 * translation shows the English rather than an empty line, because a patient
 * reading the wrong language still learns something and a blank teaches
 * nothing.
 */
export function pick(
  lang: Lang,
  en: string | null | undefined,
  pt: string | null | undefined
): string {
  const wanted = lang === "pt" ? pt : en;
  const other = lang === "pt" ? en : pt;
  return (wanted?.trim() || other?.trim() || "") as string;
}

/** Screen copy: `t(lang, { en: "Tasks", pt: "Tarefas" })`. English is written first. */
export function t(lang: Lang, copy: { en: string; pt: string }): string {
  return lang === "pt" ? copy.pt : copy.en;
}
