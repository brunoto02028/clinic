import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from '@/lib/get-effective-user';

export const dynamic = "force-dynamic";

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

    // Check service access records
    const serviceAccess = await (prisma as any).serviceAccess.findMany({
      where: {
        patientId: userId,
        OR: [{ granted: true }, { paid: true }],
      },
    });

    // Build a map of accessible services
    const accessMap: Record<string, boolean> = {
      CONSULTATION: false,
      FOOT_SCAN: false,
      BODY_ASSESSMENT: false,
    };

    for (const sa of serviceAccess) {
      // Check expiration
      if (sa.expiresAt && new Date(sa.expiresAt) < new Date()) continue;
      accessMap[sa.serviceType] = true;
    }

    // Check active patient packages (also grant access for included services)
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
