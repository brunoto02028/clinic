// Flattens image bytes onto a solid background and re-encodes as PNG.
// Many email clients (notably Gmail's mobile apps) mis-render transparent
// PNG/WebP — especially on dark backgrounds, where the transparent area can
// show as a solid black box, or where a client-injected dark-mode background
// swaps out behind the image while the image's own background stays
// unrelated, breaking the intended look. Baking the intended colour into a
// real, opaque PNG sidesteps both problems.
export function isValidHexColor(hex: string): boolean {
  return /^[0-9a-fA-F]{6}$/.test(hex);
}

// The brand's bone/cream colour, as a bare hex (no #) — the default
// background to flatten a logo onto when nothing more specific is given.
// Defined here (a dependency-free module) rather than in lib/email-templates
// (which pulls in prisma and the rest of the email pipeline) so a lightweight
// route like app/api/email-logo doesn't have to import that whole module
// graph just for a colour constant. lib/email-templates.ts's BRAND_BONE is
// derived from this, not the other way round.
export const DEFAULT_FLATTEN_BG = "F5F4F1";

export async function flattenToPng(buffer: Buffer, bgHex: string): Promise<Buffer> {
  const hex = bgHex.replace(/^#/, "");
  if (!isValidHexColor(hex)) {
    throw new Error(`Invalid background colour: ${bgHex}`);
  }
  const sharp = (await import("sharp")).default;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return sharp(buffer).flatten({ background: { r, g, b } }).png().toBuffer();
}

// The one place that decides what counts as "same origin as this app" for
// image URLs — used both when building a flattened-logo URL to embed in an
// email (lib/email-templates.ts) and when a request to fetch+flatten one
// comes in (app/api/email-logo/route.ts). Deliberately pinned to
// NEXTAUTH_URL/a fixed fallback, never to an incoming request's Host header
// — trusting the Host header here would let a spoofed Host turn the
// same-origin check into an open SSRF proxy (any reverse proxy that doesn't
// strictly pin Host would let it through).
// Parsed lazily inside resolveSameOriginUrl, not at module load — a
// malformed NEXTAUTH_URL (e.g. set without a protocol) would otherwise throw
// synchronously on import and crash every module that imports this file
// (email-templates.ts, image-serve, email-logo), not just the logo feature.
function trustedOrigin(): string {
  try {
    return new URL(process.env.NEXTAUTH_URL || "https://bpr.clinic").origin;
  } catch {
    return "https://bpr.clinic";
  }
}

export function resolveSameOriginUrl(src: string): URL | null {
  const origin = trustedOrigin();
  let resolved: URL;
  try {
    resolved = new URL(src, origin);
  } catch {
    return null;
  }
  return resolved.origin === origin ? resolved : null;
}
