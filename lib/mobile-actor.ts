import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAccessToken } from "@/lib/mobile-tokens";
import type { Actor, ActorRole } from "@/lib/tenant-access";

/**
 * Builds a tenant-access Actor from a mobile Bearer token, so the workout
 * endpoints can reuse the same access helpers as the web (getActor). Role and
 * tenant are re-read from the DB — a token minted before a change doesn't keep
 * stale reach. Returns null when the token is missing/invalid or the user is
 * gone/inactive. No impersonation on mobile.
 */
export async function getMobileActor(request: NextRequest): Promise<Actor | null> {
  const auth = request.headers.get("authorization");
  const token = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
  if (!token) return null;

  let sub: string;
  try {
    sub = verifyAccessToken(token).sub;
  } catch {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: sub },
    select: { id: true, role: true, clinicId: true, isActive: true },
  });
  if (!user || !user.isActive) return null;

  return {
    userId: user.id,
    role: user.role as ActorRole,
    clinicId: user.clinicId,
    isImpersonating: false,
  };
}
