export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import { parseMeasurementBody, resolveProtocolWeek } from "@/lib/limb-measurements";

// GET — post-op limb measurements of a patient, newest first (activity 67)
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const access = await staffPatientAccess(request, params.id);
    if (access.response) return access.response;

    const measurements = await prisma.patientLimbMeasurement.findMany({
      where: { patientId: params.id },
      orderBy: { measuredAt: "desc" },
    });
    return NextResponse.json({ measurements });
  } catch (error) {
    console.error("[measurements] GET error:", error);
    return NextResponse.json({ error: "Failed to load measurements" }, { status: 500 });
  }
}

// POST — record a measurement; the server stamps the protocol + week
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const access = await staffPatientAccess(request, params.id);
    if (access.response) return access.response;

    const body = await request.json().catch(() => null);
    const parsed = parseMeasurementBody(body, false);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const patient = await prisma.user.findUnique({ where: { id: params.id }, select: { clinicId: true } });
    if (!patient?.clinicId) return NextResponse.json({ error: "Patient has no clinic" }, { status: 400 });

    const measuredAt = parsed.data.measuredAt ?? new Date();
    const link = await resolveProtocolWeek(params.id, measuredAt);

    const measurement = await prisma.patientLimbMeasurement.create({
      data: {
        ...parsed.data,
        operatedSide: parsed.data.operatedSide!,
        measuredAt,
        clinicId: patient.clinicId,
        patientId: params.id,
        recordedById: access.actor.userId,
        ...link,
      },
    });
    return NextResponse.json({ measurement }, { status: 201 });
  } catch (error) {
    console.error("[measurements] POST error:", error);
    return NextResponse.json({ error: "Failed to save measurement" }, { status: 500 });
  }
}
