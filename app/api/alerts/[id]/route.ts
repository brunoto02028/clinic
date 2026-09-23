// PATCH /api/alerts/[id] — acknowledge or resolve (activity 072, T-2).
// Who pressed it and when is the point: an alert nobody owns is an alert
// nobody acts on.
import { NextRequest, NextResponse } from "next/server";
import { AlertStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionStaffActor } from "@/lib/tenant-access";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  // See app/api/alerts/route.ts: the signed-in staff member, not the patient
  // they may be viewing as.
  const actor = await getSessionStaffActor(request);
  if (!actor) {
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
    where: {
      id: params.id,
      clinicId: actor.clinicId,
      // Acknowledging only moves an alert forward. Without this, a PATCH on a
      // resolved alert would drag it back to ACKNOWLEDGED and leave the row
      // contradicting itself: "acknowledged", with a resolution stamp on it.
      ...(action === "acknowledge" ? { status: AlertStatus.OPEN } : {}),
    },
    data:
      action === "acknowledge"
        ? { status: AlertStatus.ACKNOWLEDGED, ackById: actor.userId, ackAt: new Date() }
        : { status: AlertStatus.RESOLVED, resolvedById: actor.userId, resolvedAt: new Date() },
  });

  if (updated.count === 0) {
    // Another clinic's alert is indistinguishable from one that does not exist.
    // An acknowledge that no longer applies says so, rather than claiming the
    // alert is missing.
    const exists = await prisma.alert.findFirst({
      where: { id: params.id, clinicId: actor.clinicId },
      select: { status: true },
    });
    if (exists) {
      return NextResponse.json(
        { error: `Cannot acknowledge an alert that is ${exists.status}` },
        { status: 409 }
      );
    }
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
