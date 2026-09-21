export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import { hasMeasurement, parseMeasurementBody, resolveProtocolWeek } from "@/lib/limb-measurements";

// Scoped by patient as well as id: a measurement id of another patient (or
// another clinic) answers exactly like a missing one.
async function findOwn(patientId: string, measurementId: string) {
  return prisma.patientLimbMeasurement.findFirst({ where: { id: measurementId, patientId } });
}

// PATCH — correct a measurement (typos, wrong date); week is re-resolved when the date changes
export async function PATCH(request: NextRequest, { params }: { params: { id: string; measurementId: string } }) {
  try {
    const access = await staffPatientAccess(request, params.id);
    if (access.response) return access.response;

    const existing = await findOwn(params.id, params.measurementId);
    if (!existing) return NextResponse.json({ error: "Measurement not found" }, { status: 404 });

    const body = await request.json().catch(() => null);
    const parsed = parseMeasurementBody(body, true);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    // An edit may clear fields, but never leave a record with no measurement at all.
    if (!hasMeasurement({ ...existing, ...parsed.data })) {
      return NextResponse.json({ error: "A measurement needs at least one thigh value or knee angle; delete it instead" }, { status: 400 });
    }

    // Re-stamp protocol/week only when the day really changed, so fixing a typo
    // in an old measurement never re-links it to a newer protocol.
    const dayOf = (d: Date) => d.toISOString().slice(0, 10);
    const newDate = parsed.data.measuredAt;
    const dateChanged = !!newDate && dayOf(newDate) !== dayOf(existing.measuredAt);
    const link = dateChanged ? await resolveProtocolWeek(params.id, newDate!) : {};
    const data = { ...parsed.data, ...link };
    if (!dateChanged) delete data.measuredAt;
    const measurement = await prisma.patientLimbMeasurement.update({ where: { id: existing.id }, data });
    return NextResponse.json({ measurement });
  } catch (error) {
    console.error("[measurements] PATCH error:", error);
    return NextResponse.json({ error: "Failed to update measurement" }, { status: 500 });
  }
}

// DELETE — remove a measurement
export async function DELETE(request: NextRequest, { params }: { params: { id: string; measurementId: string } }) {
  try {
    const access = await staffPatientAccess(request, params.id);
    if (access.response) return access.response;

    const existing = await findOwn(params.id, params.measurementId);
    if (!existing) return NextResponse.json({ error: "Measurement not found" }, { status: 404 });

    await prisma.patientLimbMeasurement.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[measurements] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete measurement" }, { status: 500 });
  }
}
