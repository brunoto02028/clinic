import { loadRule } from "@/lib/automation/rules";

/**
 * Noticing that a device stopped sending.
 *
 * Nothing breaks when it happens. The subscription expires, the patient signs
 * out of Withings on their phone, the cuff on the reception desk is unplugged
 * to charge and never plugged back in — and in every one of those the data
 * simply stops arriving. No error, no alert, no red anywhere. The clinic finds
 * out when it goes looking, which is usually when it needed the readings.
 *
 * `lastSyncedAt` cannot answer this: it says when we last talked to the
 * provider, and we talk to them whether or not they have anything for us.
 * `lastReadingAt` is the one that means data (activity 075, T-11).
 *
 * The number of days lives in an AutomationRule so a clinic can change it
 * without a deploy — someone measuring once a week is not someone measuring
 * every morning, and one threshold for both would either shout or say nothing.
 */

export const DEFAULT_SILENT_DAYS = 5;
/** O código da regra, em um lugar só — errar a string aqui e no seed daria o
 *  padrão para sempre, em silêncio. */
export const SILENCE_RULE = "WEARABLE_SILENCE";
const DAY_MS = 24 * 60 * 60 * 1000;

/** How many days since anything arrived. Null when we have never had a reading. */
export function daysSilent(connection: {
  lastReadingAt?: Date | string | null;
  createdAt?: Date | string | null;
}): number | null {
  // A connection that has never delivered anything is measured from when it
  // was made: "connected a month ago and never sent a thing" is exactly the
  // case worth surfacing, and treating it as "no data yet" would hide it.
  const from = connection.lastReadingAt ?? connection.createdAt;
  if (!from) return null;
  const since = from instanceof Date ? from : new Date(from);
  if (Number.isNaN(since.getTime())) return null;
  return Math.floor((Date.now() - since.getTime()) / DAY_MS);
}

/** The clinic's threshold, from the rule, falling back to the default. */
export async function silenceThreshold(clinicId: string | null | undefined): Promise<number> {
  if (!clinicId) return DEFAULT_SILENT_DAYS;
  try {
    const rule = await loadRule(SILENCE_RULE, clinicId);
    // O painel mostra um interruptor para cada regra e o PATCH aceita
    // `active`. Ignorá-lo aqui faria o admin desligar a regra e os avisos
    // continuarem — uma alavanca ligada em nada, que é exatamente o que os
    // comentários do seed condenam. Desligada = limiar infinito, ou seja,
    // ninguém é marcado como mudo.
    if (rule && rule.active === false) return Number.POSITIVE_INFINITY;
    const raw = (rule?.condition as any)?.silentDays;
    const days = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(days) && days > 0 ? days : DEFAULT_SILENT_DAYS;
  } catch {
    // A rule that cannot be read must not turn every device silent, nor hide a
    // real silence. The default is the honest middle.
    return DEFAULT_SILENT_DAYS;
  }
}

export function isSilent(
  connection: { lastReadingAt?: Date | string | null; createdAt?: Date | string | null; status?: string },
  thresholdDays: number
): boolean {
  // Só `DISCONNECTED` isenta: quem desconectou sabe que não vai receber nada.
  // `ERROR` é o oposto — é o estado que significa "quebrado" e ninguém sabe,
  // então é justamente o que precisa aparecer (code review da T-11).
  if (connection.status === "DISCONNECTED") return false;
  const days = daysSilent(connection);
  return days !== null && days >= thresholdDays;
}
