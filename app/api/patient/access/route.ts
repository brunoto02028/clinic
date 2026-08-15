export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { computePatientAccess, PATIENT_ACCESS_SELECT } from "@/lib/patient-access";

/**
 * GET /api/patient/access
 *
 * What this patient can open. The rules themselves live in lib/patient-access
 * so that the admin permissions screen answers with the same voice — the two
 * used to compute it separately and disagreed about the strings "hidden" and
 * "locked", about full access, and about free plans.
 */
export async function GET() {
  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = effectiveUser.userId;
    const userRole = effectiveUser.role;

    const patient = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: PATIENT_ACCESS_SELECT,
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const access = computePatientAccess({ ...patient, role: userRole });

    const activePlans = (patient.patientSubscriptions || [])
      .map((s: any) => s.plan)
      .filter(Boolean)
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        interval: p.interval,
        isFree: p.isFree,
      }));

    return NextResponse.json({
      modules: access.modules,
      hiddenModules: access.hiddenModules,
      permissions: access.permissions,
      role: userRole,
      fullAccessOverride: access.fullAccessOverride,
      isFree: access.isFree,
      hasActiveSubscription: access.hasActiveSubscription,
      hasActiveTreatment: access.hasActiveTreatment,
      activePlans,
      onboarding: access.onboarding,
    });
  } catch (error: any) {
    console.error("[patient/access] Error:", error);
    return NextResponse.json({ error: "Failed to check access" }, { status: 500 });
  }
}
