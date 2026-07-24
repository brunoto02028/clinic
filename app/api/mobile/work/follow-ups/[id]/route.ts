export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth-guard";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";
import { prisma } from "@/lib/db";

export function OPTIONS() {
  return corsPreflight();
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = getMobileUser(request);
  if (!payload) return corsJson({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.followUpStep.findUnique({ where: { id } });
  if (!existing || existing.userId !== payload.sub) {
    return corsJson({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { status } = body;

  if (!status || !["DONE", "SKIPPED"].includes(status)) {
    return corsJson({ error: "status must be DONE or SKIPPED" }, { status: 400 });
  }

  const followUp = await prisma.followUpStep.update({
    where: { id },
    data: {
      status,
      completedAt: new Date(),
    },
  });

  return corsJson({ followUp });
}
