export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, accessErrorResponse, AccessError } from "@/lib/tenant-access";
import { assertStudentNutritionAccess } from "@/lib/nutrition-access";

// GET — the signed-in student's ACTIVE meal plan (with meals + their own logs).
// Returns null when no active plan is set.
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertStudentNutritionAccess(actor);

    const plan = await prisma.mealPlan.findFirst({
      where: { studentId: actor.userId, status: "ACTIVE" },
      include: {
        meals: { orderBy: { order: "asc" } },
        logs: {
          where: { studentId: actor.userId },
          orderBy: { performedAt: "desc" },
          take: 200,
          select: { id: true, mealId: true, mealName: true, loggedDate: true, performedAt: true, note: true, photoUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(plan);
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[meal-plans] GET error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
