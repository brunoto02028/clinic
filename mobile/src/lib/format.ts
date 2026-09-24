import type { Lang } from "./i18n";

/**
 * An ISO datetime as the patient reads it.
 *
 * The locale used to be `pt-BR`, full stop — so a patient whose record said
 * `en-GB` read "qua., 23 de set." on their own appointment. English is the
 * default here for the same reason it is everywhere else in this app.
 */
export function formatDateTime(iso: string, lang: Lang = "en"): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(lang === "pt" ? "pt-BR" : "en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string, lang: Lang = "en"): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(lang === "pt" ? "pt-BR" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
