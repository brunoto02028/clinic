import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

/**
 * Symmetric encryption for secrets that have to live in the database.
 *
 * OAuth tokens from a health provider are not like a session: they grant
 * ongoing read access to a patient's weight, sleep and blood pressure at
 * Withings, and they outlive any one request. A database dump, a backup on a
 * laptop, or a `SELECT` by anyone with read access should not hand that over,
 * so they are stored sealed and opened only in the route that calls out.
 *
 * AES-256-GCM: the tag makes tampering detectable rather than silently
 * decrypting to rubbish. The key is derived from NEXTAUTH_SECRET, which every
 * deployment already has and already treats as a secret — one more environment
 * variable is one more thing to lose.
 */
const VERSION = "v1";

function key(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required to seal provider tokens");
  // The secret is a passphrase of unknown length; AES needs exactly 32 bytes.
  return createHash("sha256").update(`wearable-token:${secret}`).digest();
}

/** `v1.<iv>.<tag>.<ciphertext>`, all base64url. */
export function seal(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), enc.toString("base64url")].join(".");
}

/**
 * Returns null rather than throwing on anything malformed, tampered with, or
 * sealed under a different secret — the caller's job is then to ask the
 * patient to reconnect, not to crash a sync.
 */
export function unseal(sealed: string | null | undefined): string | null {
  if (!sealed) return null;
  const parts = sealed.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(parts[1], "base64url"));
    decipher.setAuthTag(Buffer.from(parts[2], "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(parts[3], "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}
