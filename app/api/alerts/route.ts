// GET /api/alerts — the automation engine's alerts for the actor's clinic
// (activity 072, T-2). Staff only: an alert names a patient and says what the
// engine noticed about them.
import { NextRequest, NextResponse } from "next/server";
import { AlertPriority, AlertStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getActor, isStaff } from "@/lib/tenant-access";

export const dynamic = "force-dynamic";

function parseEnum<T extends Record<string, string>>(
  value: string | null,
  members: T
): T[keyof T] | undefined {
  if (!value) return undefined;
  return Object.values(members).includes(value) ? (value as T[keyof T]) : undefined;
}

export async function GET(request: NextRequest) {
  const actor = await getActor(request);
  if (!actor) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!isStaff(actor)) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }
  // No resolved tenant means no access, never "every clinic".
  if (!actor.clinicId) {
    return NextResponse.json({ error: "No clinic in context" }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const status = parseEnum(params.get("status"), AlertStatus);
  const priority = parseEnum(params.get("priority"), AlertPriority);

  const alerts = await prisma.alert.findMany({
    where: {
      clinicId: actor.clinicId,
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
    },
    orderBy: [
      // URGENT first, then newest. Prisma sorts an enum by its declared order,
      // which runs LOW → URGENT, so this is descending.
      { priority: "desc" },
      { createdAt: "desc" },
    ],
    take: 200,
    select: {
      id: true,
      ruleCode: true,
      priority: true,
      status: true,
      title: true,
      details: true,
      createdAt: true,
      ackAt: true,
      resolvedAt: true,
      patient: { select: { id: true, firstName: true, lastName: true } },
      ackBy: { select: { firstName: true, lastName: true } },
      resolvedBy: { select: { firstName: true, lastName: true } },
    },
  });

  const openCount = await prisma.alert.count({
    where: { clinicId: actor.clinicId, status: AlertStatus.OPEN },
  });

  return NextResponse.json({ alerts, openCount });
}
