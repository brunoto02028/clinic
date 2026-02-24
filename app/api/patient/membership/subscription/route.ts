import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from '@/lib/get-effective-user';

export const dynamic = "force-dynamic";

/**
 * GET /api/patient/membership/subscription
 * Returns the patient's active subscription (if any).
 */
export async function GET() {
  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = effectiveUser.userId;

    const subscription = await (prisma as any).patientSubscription.findFirst({
      where: {
        patientId: userId,
        status: { in: ["ACTIVE", "TRIALING"] },
      },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            interval: true,
            isFree: true,
            features: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ subscription });
  } catch (error: any) {
    console.error("[patient/membership/subscription] Error:", error);
    return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 });
  }
}
