// GET /api/alerts — the automation engine's alerts for the actor's clinic
// (activity 072, T-2). Staff only: an alert names a patient and says what the
// engine noticed about them.
import { NextRequest, NextResponse } from "next/server";
import { AlertPriority, AlertStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionStaffActor } from "@/lib/tenant-access";

export const dynamic = "force-dynamic";

/** `undefined` when absent, `null` when present but not a member of the enum. */
function parseEnum<T extends Record<string, string>>(
  value: string | null,
  members: T
): T[keyof T] | undefined | null {
  if (!value) return undefined;
  return Object.values(members).includes(value) ? (value as T[keyof T]) : null;
}

export async function GET(request: NextRequest) {
  // The signed-in staff member themself, not "View as Patient": this is a
  // staff route outside /api/admin, where the middleware swaps the identity
  // headers for the impersonated patient's and getActor would answer as that
  // patient — locking the admin out of their own list.
  const actor = await getSessionStaffActor(request);
  if (!actor) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }
  // No resolved tenant means no access, never "every clinic".
  if (!actor.clinicId) {
    return NextResponse.json({ error: "No clinic in context" }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const status = parseEnum(params.get("status"), AlertStatus);
  const priority = parseEnum(params.get("priority"), AlertPriority);
  // A filter we cannot honour must not be dropped in silence — "I filtered by
  // resolved and got the open ones" is worse than an error.
  if (status === null || priority === null) {
    return NextResponse.json({ error: "Unknown status or priority" }, { status: 400 });
  }

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
      titlePt: true,
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
