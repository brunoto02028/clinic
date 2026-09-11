export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";
import { getMobileActor } from "@/lib/mobile-actor";
import { assertStudentNutritionAccess } from "@/lib/nutrition-access";
import { AccessError } from "@/lib/tenant-access";

export function OPTIONS() {
  return corsPreflight();
}

// GET — the signed-in student's ACTIVE meal plan (mobile Bearer). null if none.
export async function GET(request: NextRequest) {
  try {
    const actor = await getMobileActor(request);
    if (!actor) return corsJson({ error: "Unauthorized" }, { status: 401 });
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
    return corsJson(plan);
  } catch (err) {
    if (err instanceof AccessError) return corsJson({ error: err.message }, { status: err.status });
    console.error("[mobile/meal-plans] GET error:", (err as any)?.message);
    return corsJson({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
