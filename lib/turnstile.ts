// Cloudflare Turnstile server-side verification (activity 16).
//
// The secret is read from systemConfig ('TURNSTILE_SECRET_KEY') so it can be set
// via the admin/DB without server-env access (same pattern as the AI keys), with
// an env fallback. When neither is set, the Cloudflare TEST secret (always-pass)
// is used so dev/QA works without real keys.
//
// Fail policy: missing/invalid token => rejected (fail-closed). If siteverify is
// unreachable (Cloudflare outage) => allowed (fail-open), so a real patient is
// never blocked by a rare outage.

import { getConfigValue } from "@/lib/system-config";

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
// Cloudflare-published test secret that always passes.
const TEST_SECRET = "1x0000000000000000000000000000000AA";

export async function getTurnstileSecret(): Promise<string> {
  const secret = (await getConfigValue("TURNSTILE_SECRET_KEY")) || process.env.TURNSTILE_SECRET_KEY;
  if (secret) return secret;
  // No real secret configured — fall back to Cloudflare's always-pass TEST secret
  // so dev/QA works. In production this means the bot gate is effectively OFF, so
  // warn loudly (it's an easy thing to forget after deploy).
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[turnstile] TURNSTILE_SECRET_KEY is not configured in production — using the always-pass TEST secret. Bot protection is effectively OFF. Set it in systemConfig ('TURNSTILE_SECRET_KEY').",
    );
  }
  return TEST_SECRET;
}

export async function verifyTurnstile(
  token: string | null | undefined,
  ip?: string | null,
): Promise<{ ok: boolean; reason?: string }> {
  if (!token) return { ok: false, reason: "missing-token" };

  const body = new URLSearchParams();
  body.set("secret", await getTurnstileSecret());
  body.set("response", token);
  if (ip) body.set("remoteip", ip);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(SITEVERIFY, { method: "POST", body, signal: controller.signal });
    const data: any = await res.json().catch(() => ({}));
    if (data?.success) return { ok: true };
    return { ok: false, reason: (data?.["error-codes"] || []).join(",") || "verify-failed" };
  } catch (e: any) {
    console.error("[turnstile] siteverify unreachable, failing open:", e?.message);
    return { ok: true, reason: "verify-unreachable-failopen" };
  } finally {
    clearTimeout(timeout);
  }
}

/** Best-effort client IP, honouring Cloudflare's cf-connecting-ip. */
export function getClientIp(req: Request): string | null {
  const h = req.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    (h.get("x-forwarded-for") || "").split(",")[0].trim() ||
    null
  );
}
