// Local dev and QA run with the production provider keys (Resend, Twilio,
// WhatsApp, Telegram, FCM) — a QA booking once mailed real notices to the
// clinic. Outside production every outbound message is logged and dropped.
//
//   OUTBOUND_MODE=live      send anyway (e.g. testing a provider locally)
//   OUTBOUND_MODE=sink      drop even in production
//   OUTBOUND_ALLOWLIST=a,b  let these emails / phones / chat ids / user ids through
//
// Callers apply the guard after their own "is this provider configured?" check,
// so an unconfigured channel still fails over exactly as it does in production.

export type OutboundChannel = "email" | "sms" | "whatsapp" | "telegram" | "push";

function isLive(): boolean {
  if (process.env.OUTBOUND_MODE === "live") return true;
  if (process.env.OUTBOUND_MODE === "sink") return false;
  return process.env.NODE_ENV === "production";
}

// Phones and chat ids compare by digits only, so "+44 7700 900000" and
// "447700900000" are the same destination; anything else case-insensitively.
function normalize(destination: string): string {
  const d = destination.trim().toLowerCase();
  return /^[+\d\s\-().]+$/.test(d) ? d.replace(/\D/g, "") : d;
}

/**
 * Whether a message to these destinations may really be sent. Outside live
 * mode it goes out only when every destination is allowlisted — a message is
 * dropped whole rather than silently trimmed to the allowed recipients.
 */
export function outboundAllowed(destinations: string | string[]): boolean {
  if (isLive()) return true;
  const allowed = new Set(
    (process.env.OUTBOUND_ALLOWLIST || "").split(",").map(normalize).filter(Boolean)
  );
  const list = ([] as string[]).concat(destinations).map(normalize);
  return list.length > 0 && list.every((d) => allowed.has(d));
}

/** A fresh id per dropped message — callers log the provider id into unique columns. */
export function sinkMessageId(): string {
  return `outbound-sink-${crypto.randomUUID()}`;
}

export function logSunk(
  channel: OutboundChannel,
  destinations: string | string[],
  summary: string
): void {
  let text = summary.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
  // Verification codes travel in subjects. Locally the code in the log is what
  // lets QA finish a login; a production server running in sink mode must not
  // write them to its logs.
  if (process.env.NODE_ENV === "production") text = text.replace(/\d{4,}/g, "••••");
  console.log(`[OUTBOUND-SINK] ${channel} → ${([] as string[]).concat(destinations).join(", ")}: ${text}`);
}
