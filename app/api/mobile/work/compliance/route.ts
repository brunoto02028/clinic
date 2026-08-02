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

  const deadlines = await prisma.complianceDeadline.findMany({
    where: { userId: payload.sub },
    orderBy: { dueDate: "asc" },
  });

  return corsJson({ deadlines });
}

export async function POST(request: NextRequest) {
  const payload = getMobileUser(request);
  if (!payload) return corsJson({ error: "Unauthorised" }, { status: 401 });

  const body = await request.json();
  const { companyNumber, title, description, dueDate, source } = body;

  if (!title || !dueDate) {
    return corsJson({ error: "title and dueDate are required" }, { status: 400 });
  }

  const deadline = await prisma.complianceDeadline.create({
    data: {
      userId: payload.sub,
      companyNumber: companyNumber || null,
      title,
      description: description || null,
      dueDate: new Date(dueDate),
      source: source || "manual",
    },
  });

  return corsJson({ deadline }, { status: 201 });
}
