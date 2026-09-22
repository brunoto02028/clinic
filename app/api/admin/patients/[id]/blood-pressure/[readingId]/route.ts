export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import { isPersonalTenant } from "@/lib/tenant-type";
import { parseBPBody, checkBPOrder } from "@/lib/blood-pressure";

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

  return {} as const;
}

// Scoped by patient as well as id: a reading id of another patient (or clinic) answers like a missing one.
async function findOwn(patientId: string, readingId: string) {
  return prisma.bloodPressureReading.findFirst({ where: { id: readingId, patientId } });
}

// PATCH — correct a reading (typo, wrong time)
export async function PATCH(request: NextRequest, { params }: { params: { id: string; readingId: string } }) {
  try {
    const guard = await requireStaff(request, params.id);
    if (guard.response) return guard.response;

    const existing = await findOwn(params.id, params.readingId);
    if (!existing) return NextResponse.json({ error: "Reading not found" }, { status: 404 });

    const parsed = parseBPBody(await request.json().catch(() => null), true);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const finalSys = parsed.data.systolic ?? existing.systolic;
    const finalDia = parsed.data.diastolic ?? existing.diastolic;
    const orderErr = checkBPOrder(finalSys, finalDia);
    if (orderErr) return NextResponse.json({ error: orderErr }, { status: 400 });

    const reading = await prisma.bloodPressureReading.update({
      where: { id: existing.id },
      data: parsed.data,
      include: { recordedBy: { select: { firstName: true, lastName: true } } },
    });
    return NextResponse.json({ reading });
  } catch (error) {
    console.error("[admin blood-pressure] PATCH error:", error);
    return NextResponse.json({ error: "Failed to update reading" }, { status: 500 });
  }
}

// DELETE — remove a reading
export async function DELETE(request: NextRequest, { params }: { params: { id: string; readingId: string } }) {
  try {
    const guard = await requireStaff(request, params.id);
    if (guard.response) return guard.response;

    const existing = await findOwn(params.id, params.readingId);
    if (!existing) return NextResponse.json({ error: "Reading not found" }, { status: 404 });

    await prisma.bloodPressureReading.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin blood-pressure] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete reading" }, { status: 500 });
  }
}
