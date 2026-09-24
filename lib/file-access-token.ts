import { createHmac, timingSafeEqual } from "crypto";

/**
 * A short-lived, signed link to one document, for the app.
 *
 * `/api/files/[id]` authenticates by session cookie, which is right for the
 * browser and useless for the app: the phone opens a document in the system
 * viewer, and that viewer carries no session. The parity audit found the
 * result — the document appeared in the app's list and tapping it did nothing
 * at all, silently, because `Linking.openURL` was handed a relative path and
 * the failure was swallowed.
 *
 * So the link itself carries the permission, bound to one file, one person,
 * and a few minutes. Same shape as `lib/wearable-state.ts`: payload plus an
 * HMAC this server can check, nothing the client can forge.
 *
 * It is a capability URL, so it is deliberately short-lived. Five minutes is
 * long enough to open a PDF and short enough that a link pasted somewhere
 * later is already dead.
 */
const TTL_MS = 5 * 60 * 1000;

function secret(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET is required to sign file links");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function signFileToken(fileId: string, userId: string): string {
  const payload = `${fileId}.${userId}.${Date.now() + TTL_MS}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

/** The user a token proves, for this file — or null if it proves nothing. */
export function verifyFileToken(token: string | null | undefined, fileId: string): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;

  const payload = Buffer.from(token.slice(0, dot), "base64url").toString("utf8");
  const given = Buffer.from(token.slice(dot + 1));
  let expected: Buffer;
  try {
    expected = Buffer.from(sign(payload));
  } catch {
    return null;
  }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  const [signedFileId, userId, expiresAt] = payload.split(".");
  // The file is part of what is signed: a token for one document must not
  // open another.
  if (!signedFileId || signedFileId !== fileId || !userId) return null;
  if (!Number(expiresAt) || Number(expiresAt) < Date.now()) return null;
  return userId;
}
