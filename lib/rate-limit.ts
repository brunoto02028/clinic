// Simple in-memory rate limiter (activity 16). Fixed-window counter keyed by an
// arbitrary string (usually route + client IP). Single-instance only: resets on
// restart and is not shared across instances — adequate for the current single
// VPS deployment; move to Redis/DB if the app scales horizontally.

type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, e] of buckets) if (e.resetAt <= now) buckets.delete(k);
}

export function rateLimit(
  key: string,
  opts: { max: number; windowMs: number },
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  sweep(now);
  const e = buckets.get(key);
  if (!e || e.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  if (e.count >= opts.max) {
    return { allowed: false, retryAfter: Math.ceil((e.resetAt - now) / 1000) };
  }
  e.count += 1;
  return { allowed: true, retryAfter: 0 };
}
