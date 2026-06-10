import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import type { ValidatedUser } from "@/lib/auth-credentials";

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is not configured");
  }
  return secret;
}

export interface AccessTokenPayload {
  sub: string; // user id
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  clinicId: string | null;
  clinicName: string | null;
  clinicSlug: string | null;
  permissions: ValidatedUser["permissions"];
}

/** Signs a short-lived access JWT mirroring the web session payload. */
export function signAccessToken(user: ValidatedUser): string {
  const payload: AccessTokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    clinicId: user.clinicId,
    clinicName: user.clinicName,
    clinicSlug: user.clinicSlug,
    permissions: user.permissions,
  };
  return jwt.sign(payload, getSecret(), {
    algorithm: "HS256",
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

/** Verifies an access JWT. Throws if invalid/expired. Algorithm is pinned. */
export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, getSecret(), {
    algorithms: ["HS256"],
  }) as AccessTokenPayload;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Issues a new opaque refresh token, persisting only its hash.
 * Returns the plaintext token (only time it exists outside the client).
 */
export async function issueRefreshToken(
  userId: string,
  userAgent?: string
): Promise<string> {
  const plaintext = crypto.randomBytes(32).toString("hex");
  await prisma.mobileRefreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(plaintext),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      userAgent: userAgent?.slice(0, 255) || null,
    },
  });
  return plaintext;
}

/**
 * Validates and rotates a refresh token: revokes the presented one and issues a
 * fresh pair-half. Returns the userId on success, or null if invalid/expired/revoked.
 */
export async function rotateRefreshToken(
  plaintext: string,
  userAgent?: string
): Promise<{ userId: string; refreshToken: string } | null> {
  const tokenHash = hashToken(plaintext);
  const existing = await prisma.mobileRefreshToken.findUnique({
    where: { tokenHash },
  });

  if (!existing || existing.expiresAt < new Date()) {
    return null;
  }

  // Reuse detection: an already-revoked token being presented signals a
  // possible stolen/replayed token. Revoke the user's whole active family.
  if (existing.revokedAt) {
    await revokeAllForUser(existing.userId);
    return null;
  }

  // Atomic rotation: the conditional revoke is the concurrency guard. If two
  // requests race with the same refresh token, only one update affects a row.
  const revoked = await prisma.mobileRefreshToken.updateMany({
    where: { id: existing.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (revoked.count !== 1) {
    return null; // lost the race — another request already rotated it
  }

  const refreshToken = await issueRefreshToken(existing.userId, userAgent);
  return { userId: existing.userId, refreshToken };
}

/** Revokes every active refresh token for a user (logout-all / reuse response). */
export async function revokeAllForUser(userId: string): Promise<void> {
  await prisma.mobileRefreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Revokes a refresh token (logout). No-op if not found. */
export async function revokeRefreshToken(plaintext: string): Promise<void> {
  const tokenHash = hashToken(plaintext);
  await prisma.mobileRefreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
