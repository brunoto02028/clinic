/**
 * Mirror of the web's `lib/clinic-timezone.ts`.
 *
 * The app cannot import from the Next project — separate package, separate
 * tsconfig — so this is a copy, deliberately kept identical. If the rule there
 * changes, change it here too.
 *
 * Why it matters: the booking screen used to build the instant as
 * `` `${date}T${time}:00.000Z` ``, treating the patient's chosen wall-clock
 * time as if it were already UTC. From late March to late October the UK is on
 * BST, one hour ahead — so a patient picking 09:00 stored 09:00Z, which the
 * clinic's diary renders as 10:00. In winter the two agree, which is what made
 * it hard to notice: the bug appears and disappears on the daylight-saving
 * boundary, and in between the patient and the clinic simply hold different
 * beliefs about when the appointment is.
 *
 * Uses only `Intl`, so there is no dependency to add: Hermes ships the ICU data
 * that knows the BST/GMT rules.
 */

export const CLINIC_TIMEZONE = "Europe/London";

/**
 * Convert a "YYYY-MM-DD" + "HH:mm" pair, meant as clinic-local wall-clock time,
 * into the real UTC instant it represents.
 */
export function zonedTimeToUtc(
  dateStr: string,
  timeStr: string,
  timeZone = CLINIC_TIMEZONE
): Date {
  const naiveUtc = new Date(`${dateStr}T${timeStr}:00.000Z`);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(naiveUtc)) parts[p.type] = p.value;
  const hour = parts.hour === "24" ? 0 : Number(parts.hour);
  const shownAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second)
  );
  const offset = shownAsUtc - naiveUtc.getTime();
  return new Date(naiveUtc.getTime() - offset);
}
