export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { patientGate } from "@/lib/patient-gate";

// GET: active treatment types for the patient's clinic (read-only, for waitlist/booking pickers)
export async function GET() {
  // Consentimento e plano valem no servidor, não só na tela (auditoria de paridade, 24/09/2026).
  const __gate = await patientGate();
  if (__gate.response) return __gate.response;

  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const patient = await prisma.user.findUnique({
      where: { id: effectiveUser.userId },
      select: { clinicId: true },
    });

    if (!patient?.clinicId) return NextResponse.json([]);

    const treatments = await prisma.treatmentType.findMany({
      where: { clinicId: patient.clinicId, isActive: true },
      select: { id: true, name: true, namePt: true, duration: true, price: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(treatments);
  } catch (err: any) {
    console.error("[patient-treatment-types] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
