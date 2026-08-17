// lib/settings-client.ts — one shared read of /api/settings per page load.
//
// Four independent components want the clinic settings on the public landing
// page (the page itself, the footer, the favicon and the WhatsApp button), and
// each used to fetch on mount. That is four identical requests competing for
// bandwidth with the hero image on a phone.
//
// The promise is memoised at module scope, so whoever asks first triggers the
// request and everyone else awaits the same one. Resolves to null on failure,
// which is what every caller already treated as "no settings".

let inFlight: Promise<any | null> | null = null;

export function getSettings(): Promise<any | null> {
  if (!inFlight) {
    inFlight = fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return inFlight;
}

/** Drops the memoised value so the next call refetches — for the admin screens
 *  that save settings and need to see their own change. */
export function invalidateSettings() {
  inFlight = null;
}
