export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import { isPersonalTenant } from "@/lib/tenant-type";
import { parseBPBody } from "@/lib/blood-pressure";

// staffPatientAccess already resolves the actor (session cookie or mobile
// bearer token) and checks it's staff of the patient's own tenant — reusing
// its actor here instead of a second getServerSession() call, which only
// ever recognised a cookie session and 401'd every mobile-token caller.
async function requireStaff(request: NextRequest, patientId: string) {
  const tenantAccess = await staffPatientAccess(request, patientId);
  if (tenantAccess.response) return { response: tenantAccess.response } as const;
  const { actor } = tenantAccess;

  if (!actor.clinicId) return { response: NextResponse.json({ error: "Patient not found" }, { status: 404 }) } as const;
  const clinic = await prisma.clinic.findUnique({ where: { id: actor.clinicId }, select: { type: true } });
  if (isPersonalTenant(clinic?.type)) {
    return { response: NextResponse.json({ error: "Not available for studio accounts" }, { status: 403 }) } as const;
  }

  return { userId: actor.userId, clinicId: actor.clinicId } as const;
}

// GET — admin view of a patient's BP readings
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guard = await requireStaff(request, params.id);
    if (guard.response) return guard.response;

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "90");
    const since = new Date();
    since.setDate(since.getDate() - days);

    const readings = await prisma.bloodPressureReading.findMany({
      where: { patientId: params.id, measuredAt: { gte: since } },
      orderBy: { measuredAt: "desc" },
      include: { recordedBy: { select: { firstName: true, lastName: true } } },
    });

    // Calculate stats
    if (readings.length > 0) {
      const avgSystolic = Math.round(readings.reduce((s: number, r: any) => s + r.systolic, 0) / readings.length);
      const avgDiastolic = Math.round(readings.reduce((s: number, r: any) => s + r.diastolic, 0) / readings.length);
      const avgHR = readings.filter((r: any) => r.heartRate).length > 0
        ? Math.round(readings.filter((r: any) => r.heartRate).reduce((s: number, r: any) => s + (r.heartRate || 0), 0) / readings.filter((r: any) => r.heartRate).length)
        : null;
      const latest = readings[0];

      return NextResponse.json({
        readings,
        stats: {
          count: readings.length,
          avgSystolic,
          avgDiastolic,
          avgHeartRate: avgHR,
          latest: { systolic: latest.systolic, diastolic: latest.diastolic, heartRate: latest.heartRate, measuredAt: latest.measuredAt },
        },
      });
    }

    return NextResponse.json({ readings: [], stats: null });
  } catch (error) {
    console.error("Error fetching patient BP readings:", error);
    return NextResponse.json({ error: "Failed to fetch readings" }, { status: 500 });
  }
}

// POST — a clinician logs a reading for this patient (e.g. right before a
// session). Never notifies the patient automatically — unlike the patient's
// own self-entry route, which e-mails a BP_HIGH_ALERT on a high reading, this
// one only returns the classification for the UI to show the therapist.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const guard = await requireStaff(request, params.id);
    if (guard.response) return guard.response;

    const parsed = parseBPBody(await request.json().catch(() => null), false);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const reading = await prisma.bloodPressureReading.create({
      data: {
        patientId: params.id,
        clinicId: guard.clinicId,
        recordedById: guard.userId,
        systolic: parsed.data.systolic!,
        diastolic: parsed.data.diastolic!,
        heartRate: parsed.data.heartRate ?? null,
        notes: parsed.data.notes ?? null,
        measuredAt: parsed.data.measuredAt ?? new Date(),
        method: "MANUAL",
        // Medida pelo terapeuta, no prontuário: não veio de casa. Ficava com
        // o default `HOME` do schema e ia assim para o relatório, para a
        // média e para o histórico do app (auditoria de paridade, F7).
        source: "MANUAL",
        context: "OTHER",
      },
      include: { recordedBy: { select: { firstName: true, lastName: true } } },
    });
    return NextResponse.json({ reading }, { status: 201 });
  } catch (error) {
    console.error("[admin blood-pressure] POST error:", error);
    return NextResponse.json({ error: "Failed to save reading" }, { status: 500 });
  }
}
