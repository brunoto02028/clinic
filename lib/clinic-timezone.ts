/**
 * The clinic operates on UK wall-clock time regardless of where the
 * server or the patient's browser happen to be. All appointment slot
 * times ("09:00", "17:00"...) are meant as Europe/London time — these
 * helpers convert between that and real UTC instants, using the
 * built-in Intl API so no extra dependency is needed (Node's bundled
 * ICU data already knows the BST/GMT daylight-saving rules).
 */

export const CLINIC_TIMEZONE = "Europe/London";

/** Convert a "YYYY-MM-DD" + "HH:mm" pair, meant as clinic-local wall-clock
 * time, into the real UTC instant it represents. */
export function zonedTimeToUtc(dateStr: string, timeStr: string, timeZone = CLINIC_TIMEZONE): Date {
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

/** "YYYY-MM-DD" for the given instant (now, by default) as seen in the clinic's timezone. */
export function getZonedDateString(date: Date = new Date(), timeZone = CLINIC_TIMEZONE): string {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  return fmt.format(date); // en-CA formats as YYYY-MM-DD
}

/** "YYYY-MM-DDTHH:mm" for the given instant as seen in the clinic's timezone —
 * suitable for pre-filling a <input type="datetime-local"> so admin edit
 * forms show/save clinic time rather than the browser's own timezone. */
export function getZonedDateTimeLocalString(date: Date, timeZone = CLINIC_TIMEZONE): string {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) parts[p.type] = p.value;
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}`;
}

/**
 * A data e a hora como a **clínica** as lê, para pôr num e-mail.
 *
 * Quatro lugares faziam `toLocaleDateString('en-GB', …)` sem `timeZone`. O
 * contêiner roda em UTC — `node:20-alpine`, sem `TZ` —, então durante o horário
 * de verão britânico o e-mail dizia **uma hora a menos** que a tela: a consulta
 * marcada para as 10:00 era anunciada às 09:00 ao paciente.
 *
 * Sete meses por ano, para todo envio. Existe um helper só porque quatro cópias
 * da mesma conta foram quatro oportunidades de esquecer o mesmo argumento.
 */
export function dataEHoraDaClinica(
  quando: Date,
  timeZone = CLINIC_TIMEZONE
): { dateStr: string; timeStr: string } {
  return {
    dateStr: quando.toLocaleDateString("en-GB", {
      timeZone,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    timeStr: quando.toLocaleTimeString("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

/** Minutes since midnight for the given instant (now, by default) as seen in the clinic's timezone. */
export function getZonedMinutesOfDay(date: Date = new Date(), timeZone = CLINIC_TIMEZONE): number {
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone, hour12: false, hour: "2-digit", minute: "2-digit" });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) parts[p.type] = p.value;
  const hour = parts.hour === "24" ? 0 : Number(parts.hour);
  return hour * 60 + Number(parts.minute);
}
