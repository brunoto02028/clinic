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

  const followUps = await prisma.followUpStep.findMany({
    where: { userId: payload.sub },
    orderBy: { dueDate: "asc" },
  });

  return corsJson({ followUps });
}

export async function POST(request: NextRequest) {
  const payload = getMobileUser(request);
  if (!payload) return corsJson({ error: "Unauthorised" }, { status: 401 });

  const body = await request.json();
  const { clientName, title, note, dueDate } = body;

  if (!clientName || !title || !dueDate) {
    return corsJson({ error: "clientName, title and dueDate are required" }, { status: 400 });
  }

  const followUp = await prisma.followUpStep.create({
    data: {
      userId: payload.sub,
      clientName,
      title,
      note: note || null,
      dueDate: new Date(dueDate),
    },
  });

  return corsJson({ followUp }, { status: 201 });
}
