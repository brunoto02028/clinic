import type { useTheme } from "@/theme/useTheme";
import { t as tr, type Lang } from "./i18n";

/**
 * One map for AppointmentStatus, because two drifted.
 *
 * The list screen and the detail screen each carried their own copy. Both had
 * a `SCHEDULED` entry — not a member of the enum — and neither had `PENDING`,
 * so an unconfirmed appointment fell through to the invented entry and told
 * the patient it was booked. Fixing the list alone left the detail screen
 * saying "Agendado" about the very appointment the list called "Pendente".
 *
 * The enum is PENDING, PENDING_PATIENT, CONFIRMED, COMPLETED, CANCELLED,
 * NO_SHOW (prisma/schema.prisma). Every member is present here; add to this
 * map, not to a screen.
 *
 * The labels were Portuguese-only, so an en-GB patient read "Pendente" and
 * "Concluído" on an otherwise English screen — the one place the language of a
 * whole list was decided by a shared helper rather than by the screen.
 */
export interface StatusStyle {
  bg: string;
  text: string;
  label: string;
  icon: string;
}

export function getStatusStyles(
  t: ReturnType<typeof useTheme>,
  lang: Lang = "en"
): Record<string, StatusStyle> {
  return {
    PENDING: { bg: t.colors.warnSoft, text: t.colors.warn, label: tr(lang, { en: "Pending", pt: "Pendente" }), icon: "time-outline" },
    PENDING_PATIENT: { bg: t.colors.warnSoft, text: t.colors.warn, label: tr(lang, { en: "Waiting for you", pt: "Aguardando você" }), icon: "time-outline" },
    CONFIRMED: { bg: t.colors.okSoft, text: t.colors.ok, label: tr(lang, { en: "Confirmed", pt: "Confirmado" }), icon: "checkmark-circle-outline" },
    COMPLETED: { bg: t.colors.surfaceMuted, text: t.colors.textMuted, label: tr(lang, { en: "Completed", pt: "Concluído" }), icon: "checkbox-outline" },
    CANCELLED: { bg: t.colors.badSoft, text: t.colors.bad, label: tr(lang, { en: "Cancelled", pt: "Cancelado" }), icon: "close-circle-outline" },
    NO_SHOW: { bg: t.colors.warnSoft, text: t.colors.warn, label: tr(lang, { en: "Did not attend", pt: "Faltou" }), icon: "alert-circle-outline" },
  };
}

/** Falls back to PENDING — the honest answer for a status we do not know is
 *  "not confirmed", never "booked". */
export function statusStyle(
  t: ReturnType<typeof useTheme>,
  status: string | null | undefined,
  lang: Lang = "en"
): StatusStyle {
  const map = getStatusStyles(t, lang);
  return map[status ?? ""] ?? map.PENDING;
}
