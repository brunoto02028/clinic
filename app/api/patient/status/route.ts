import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from '@/lib/get-effective-user';

export const dynamic = "force-dynamic";

// Map module feature keys (from MembershipPlan.features[]) to ServiceType enum values
const MODULE_TO_SERVICE: Record<string, string> = {
  mod_body_assessments: "BODY_ASSESSMENT",
  mod_foot_scans: "FOOT_SCAN",
  mod_appointments: "CONSULTATION",
};

export async function GET(req: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = effectiveUser.userId;

    // Check if medical screening exists
    const screening = await prisma.medicalScreening.findUnique({
      where: { userId },
    });

    // Build a map of accessible services
    const accessMap: Record<string, boolean> = {
      CONSULTATION: false,
      FOOT_SCAN: false,
      BODY_ASSESSMENT: false,
    };

    // ── 1. Check fullAccessOverride and moduleOverrides on User ──
    const patient = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: { fullAccessOverride: true, moduleOverrides: true },
    });

    if (patient?.fullAccessOverride) {
      // Admin master toggle: grant everything
      accessMap.CONSULTATION = true;
      accessMap.FOOT_SCAN = true;
      accessMap.BODY_ASSESSMENT = true;
    }

    // Per-patient module overrides (true/"unlocked" = grant, false/"locked"/"hidden" = deny)
    if (patient?.moduleOverrides && typeof patient.moduleOverrides === "object") {
      for (const [modKey, val] of Object.entries(patient.moduleOverrides)) {
        const svcType = MODULE_TO_SERVICE[modKey];
        if (svcType && (val === true || val === "unlocked")) {
          accessMap[svcType] = true;
        }
      }
    }

    // ── 2. Check ServiceAccess records (direct admin grants / payments) ──
    const serviceAccess = await (prisma as any).serviceAccess.findMany({
      where: {
        patientId: userId,
        OR: [{ granted: true }, { paid: true }],
      },
    });

    for (const sa of serviceAccess) {
      if (sa.expiresAt && new Date(sa.expiresAt) < new Date()) continue;
      accessMap[sa.serviceType] = true;
    }

    // ── 3. Check active PatientPackages ──
    const activePackages = await (prisma as any).patientPackage.findMany({
      where: {
        patientId: userId,
        status: 'ACTIVE',
      },
      include: { package: true },
    });

    for (const pp of activePackages) {
      if (pp.endDate && new Date(pp.endDate) < new Date()) continue;
      for (const svc of (pp.package?.includedServices || [])) {
        accessMap[svc] = true;
      }
    }

    // ── 4. Check active PatientSubscriptions → MembershipPlan.features ──
    const activeSubscriptions = await (prisma as any).patientSubscription.findMany({
      where: {
        patientId: userId,
        status: "ACTIVE",
      },
      include: {
        plan: { select: { features: true, isFree: true } },
      },
    });

    for (const sub of activeSubscriptions) {
      if (!sub.plan?.features) continue;
      for (const featureKey of sub.plan.features) {
        const svcType = MODULE_TO_SERVICE[featureKey];
        if (svcType) {
          accessMap[svcType] = true;
        }
      }
    }

    return NextResponse.json({
      screeningComplete: !!screening,
      screeningLocked: screening?.isLocked ?? false,
      screeningSubmitted: screening?.isSubmitted ?? false,
      editRequested: !!screening?.editRequestedAt && !screening?.editApprovedAt,
      serviceAccess: accessMap,
      screeningId: screening?.id || null,
      activePackages: activePackages.map((pp: any) => ({
        id: pp.id,
        name: pp.package?.name,
        includedServices: pp.package?.includedServices,
        endDate: pp.endDate,
      })),
    });
  } catch (error: any) {
    console.error("[patient/status] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
