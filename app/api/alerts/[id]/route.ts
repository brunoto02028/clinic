// PATCH /api/alerts/[id] — acknowledge or resolve (activity 072, T-2).
// Who pressed it and when is the point: an alert nobody owns is an alert
// nobody acts on.
import { NextRequest, NextResponse } from "next/server";
import { AlertStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getActor, isStaff } from "@/lib/tenant-access";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getActor(request);
  if (!actor) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!isStaff(actor)) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }
  if (!actor.clinicId) {
    return NextResponse.json({ error: "No clinic in context" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const action = body?.action;
  if (action !== "acknowledge" && action !== "resolve") {
    return NextResponse.json(
      { error: "action must be 'acknowledge' or 'resolve'" },
      { status: 400 }
    );
  }

  // Scoped by clinic in the same statement as the update: reading first and
  // checking after leaves a window where the row could belong to someone else.
  const updated = await prisma.alert.updateMany({
    where: { id: params.id, clinicId: actor.clinicId },
    data:
      action === "acknowledge"
        ? { status: AlertStatus.ACKNOWLEDGED, ackById: actor.userId, ackAt: new Date() }
        : { status: AlertStatus.RESOLVED, resolvedById: actor.userId, resolvedAt: new Date() },
  });

  if (updated.count === 0) {
    // Another clinic's alert is indistinguishable from one that does not exist.
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  const alert = await prisma.alert.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      status: true,
      ackAt: true,
      resolvedAt: true,
      ackBy: { select: { firstName: true, lastName: true } },
      resolvedBy: { select: { firstName: true, lastName: true } },
    },
  });

  return NextResponse.json({ alert });
}
