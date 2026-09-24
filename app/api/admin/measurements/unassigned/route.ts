export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionStaffActor } from "@/lib/tenant-access";

/**
 * Readings from the clinic's cuff that matched no measurement window.
 *
 * They exist because the alternative is guessing whose record they belong in.
 * Until a human says, they are in nobody's — this list is the only place they
 * appear, which is why the count also rides in the admin badge.
 */
export async function GET(req: NextRequest) {
  const actor = await getSessionStaffActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!actor.clinicId) return NextResponse.json({ measurements: [], count: 0 });

  const measurements = await (prisma as any).unassignedMeasurement.findMany({
    where: { clinicId: actor.clinicId, assignedAt: null, discardedAt: null },
    orderBy: { measuredAt: "desc" },
    take: 100,
    select: {
      id: true, systolic: true, diastolic: true, heartRate: true,
      measuredAt: true, receivedAt: true,
      connection: { select: { deviceLabel: true } },
    },
  });

  return NextResponse.json({ measurements, count: measurements.length });
}
