export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, accessErrorResponse, AccessError } from "@/lib/tenant-access";
import { assertStudentNutritionAccess } from "@/lib/nutrition-access";

// GET — the student's tenant's ACTIVE billing plans + the student's own
// billing subscriptions (so the portal can show "pay" vs current status).
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertStudentNutritionAccess(actor);
    if (!actor.clinicId) return NextResponse.json({ plans: [], subscriptions: [] });

    const [plans, subscriptions] = await Promise.all([
      prisma.billingPlan.findMany({
        where: { clinicId: actor.clinicId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, description: true, amountCents: true, currency: true, interval: true },
      }),
      prisma.billingSubscription.findMany({
        where: { studentId: actor.userId },
        orderBy: { createdAt: "desc" },
        select: { id: true, billingPlanId: true, status: true, currentPeriodEnd: true, cancelAtPeriodEnd: true },
      }),
    ]);
    return NextResponse.json({ plans, subscriptions });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[billing/plans] GET error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
