import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from '@/lib/get-effective-user';

export const dynamic = "force-dynamic";

/**
 * GET /api/patient/membership/plans
 * Returns all ACTIVE membership plans available to this patient
 * (either scope=all or scope=specific + assigned to this patient).
 */
export async function GET() {
  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = effectiveUser.userId;
    const _u = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } }); const clinicId = _u?.clinicId || null;

    const plans = await (prisma as any).membershipPlan.findMany({
      where: {
        status: "ACTIVE",
        ...(clinicId ? { clinicId } : {}),
        OR: [
          { patientScope: "all" },
          { patientScope: "specific", patientId: userId },
        ],
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        interval: true,
        isFree: true,
        features: true,
        status: true,
        stripeProductId: true,
        stripePriceId: true,
      },
      orderBy: { price: "asc" },
    });

    return NextResponse.json(plans);
  } catch (error: any) {
    console.error("[patient/membership/plans] Error:", error);
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
  }
}
