import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function hasEntitlement(
  userId: string,
  featureKey: string
): Promise<boolean> {
  const ent = await prisma.entitlement.findFirst({
    where: {
      userId,
      featureKey,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });
  return ent !== null;
}

export async function grantEntitlement(
  userId: string,
  featureKey: string,
  source: "REVENUECAT" | "STRIPE" | "ADMIN_GRANT",
  opts?: {
    externalId?: string;
    expiresAt?: Date;
    metadata?: Record<string, unknown>;
  }
) {
  const meta = (opts?.metadata ?? undefined) as
    | Prisma.InputJsonValue
    | undefined;

  return prisma.entitlement.upsert({
    where: { userId_featureKey_source: { userId, featureKey, source } },
    create: {
      userId,
      featureKey,
      source,
      externalId: opts?.externalId,
      expiresAt: opts?.expiresAt,
      metadata: meta,
    },
    update: {
      isActive: true,
      revokedAt: null,
      expiresAt: opts?.expiresAt,
      externalId: opts?.externalId,
      metadata: meta,
    },
  });
}

export async function revokeEntitlement(
  userId: string,
  featureKey: string,
  source: "REVENUECAT" | "STRIPE" | "ADMIN_GRANT"
) {
  return prisma.entitlement.updateMany({
    where: { userId, featureKey, source },
    data: { isActive: false, revokedAt: new Date() },
  });
}
