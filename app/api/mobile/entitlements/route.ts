export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getMobileUser } from "@/lib/mobile-auth-guard";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";

export function OPTIONS() {
  return corsPreflight();
}

export async function GET(request: NextRequest) {
  const payload = getMobileUser(request);
  if (!payload) {
    return corsJson({ error: "Unauthorised" }, { status: 401 });
  }

  const entitlements = await prisma.entitlement.findMany({
    where: {
      userId: payload.sub,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: {
      id: true,
      featureKey: true,
      source: true,
      expiresAt: true,
      grantedAt: true,
    },
    orderBy: { grantedAt: "desc" },
  });

  return corsJson({ entitlements });
}
