import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getMobileUser } from "@/lib/mobile-auth-guard";

/**
 * Resolves the request's user from EITHER a NextAuth session cookie (web) OR a
 * mobile bearer token. Returns a session-like object (`{ user: {...} }`) shaped
 * exactly like NextAuth's session, so existing route handlers keep working with
 * a one-line swap (`getServerSession(authOptions)` → `getRequestSession(request)`).
 *
 * Returns null when neither auth is present/valid.
 */
export async function getRequestSession(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user) return session;

  const payload = getMobileUser(request);
  if (!payload) return null;

  return {
    user: {
      id: payload.sub,
      email: payload.email,
      name: `${payload.firstName} ${payload.lastName}`,
      role: payload.role,
      firstName: payload.firstName,
      lastName: payload.lastName,
      clinicId: payload.clinicId,
      clinicName: payload.clinicName,
      clinicSlug: payload.clinicSlug,
      permissions: payload.permissions,
    },
  } as const;
}
