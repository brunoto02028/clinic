export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth-guard";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";
import { prisma } from "@/lib/db";

export function OPTIONS() {
  return corsPreflight();
}

export async function GET(request: NextRequest) {
  const payload = getMobileUser(request);
  if (!payload) return corsJson({ error: "Unauthorised" }, { status: 401 });

  let profile = await prisma.businessProfile.findUnique({
    where: { userId: payload.sub },
  });

  if (!profile) {
    profile = await prisma.businessProfile.create({
      data: {
        userId: payload.sub,
        tradingName: `${payload.firstName} ${payload.lastName}`,
      },
    });
  }

  return corsJson({ profile });
}

export async function PUT(request: NextRequest) {
  const payload = getMobileUser(request);
  if (!payload) return corsJson({ error: "Unauthorised" }, { status: 401 });

  const body = await request.json();

  const allowed = [
    "tradingName",
    "companyNumber",
    "vatNumber",
    "address",
    "phone",
    "email",
    "logoUrl",
    "bankName",
    "bankSortCode",
    "bankAccountNumber",
    "paymentTermsDays",
    "currency",
    "defaultNotes",
  ] as const;

  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  const profile = await prisma.businessProfile.upsert({
    where: { userId: payload.sub },
    update: data,
    create: {
      userId: payload.sub,
      tradingName: (data.tradingName as string) || `${payload.firstName} ${payload.lastName}`,
      ...data,
    },
  });

  return corsJson({ profile });
}
