export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getActor,
  tenantWhere,
  assertPatientAccess,
  accessErrorResponse,
  AccessError,
} from "@/lib/tenant-access";
import { assertNutritionAccess } from "@/lib/nutrition-access";
import { validateMealPlan, type MealInput, type MealPlanInput } from "@/lib/nutrition";
import { notifyPatient } from "@/lib/notify-patient";
import { loadFoodMap, mealMacroFields, mealFoodCreate, type FoodMap } from "@/lib/meal-food-build";

const STATUSES = ["ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"] as const;
type Status = (typeof STATUSES)[number];

// Builds a Meal create object. When the meal carries `foods`, macros are computed
// from the catalog and the MealFood rows are nested-created; otherwise the manual
// macros are used (activity 27 behaviour).
function mapMeal(m: MealInput & { foods?: any[] }, i: number, foodMap: FoodMap) {
  const macros = mealMacroFields(m as any, foodMap);
  const foods = mealFoodCreate(m as any);
  return {
    name: m.name.trim(),
    timeOfDay: m.timeOfDay ?? null,
    description: m.description ?? null,
    kcal: macros.kcal,
    proteinG: macros.proteinG,
    carbsG: macros.carbsG,
    fatG: macros.fatG,
    order: typeof m.order === "number" ? m.order : i,
    ...(foods.length ? { foods: { create: foods } } : {}),
  };
}

/** Best-effort notification when a plan is assigned/updated. Never fails the request. */
async function notifyPlanAssigned(studentId: string, planName: string, updated: boolean) {
  try {
    await notifyPatient({
      patientId: studentId,
      plainMessage: updated
        ? `Your trainer updated your meal plan "${planName}". Open the Nutrition tab to see it.`
        : `Your trainer set a new meal plan "${planName}" for you. Open the Nutrition tab to see it.`,
      plainMessagePt: updated
        ? `Seu personal atualizou seu plano alimentar "${planName}". Abra a aba Nutrição para ver.`
        : `Seu personal definiu um novo plano alimentar "${planName}" para você. Abra a aba Nutrição para ver.`,
    });
  } catch (err) {
    console.error("[admin/meal-plans] notify error:", (err as any)?.message);
  }
}

// GET — list a student's meal plans (with meals + adherence logs).
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertNutritionAccess(actor);

    const studentId = request.nextUrl.searchParams.get("studentId") || undefined;
    const plans = await prisma.mealPlan.findMany({
      where: { ...tenantWhere(actor), ...(studentId ? { studentId } : {}) },
      include: {
        meals: { orderBy: { order: "asc" }, include: { foods: { orderBy: { order: "asc" }, include: { food: true } } } },
        logs: {
          orderBy: { performedAt: "desc" },
          select: { id: true, mealId: true, mealName: true, loggedDate: true, performedAt: true, note: true, photoUrl: true },
        },
        student: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(plans);
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/meal-plans] GET error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}

// POST — create a meal plan for a student. An ACTIVE plan pauses the student's
// other ACTIVE plans (one active plan per student).
export async function POST(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = await assertNutritionAccess(actor);

    const body = await request.json().catch(() => null);
    const studentId = body?.studentId;
    if (!studentId) return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    await assertPatientAccess(actor, studentId);

    const input: MealPlanInput = {
      name: typeof body?.name === "string" ? body.name.trim() : "",
      targetKcal: body?.targetKcal ?? null,
      targetProteinG: body?.targetProteinG ?? null,
      targetCarbsG: body?.targetCarbsG ?? null,
      targetFatG: body?.targetFatG ?? null,
      notes: body?.notes ?? null,
      meals: Array.isArray(body?.meals) ? body.meals : [],
    };
    const vErr = validateMealPlan(input);
    if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });

    const status: Status = STATUSES.includes(body?.status) ? body.status : "ACTIVE";

    // Resolve any catalog foods referenced by the meals (tenant-scoped, active).
    const { map: foodMap, missing } = await loadFoodMap(clinicId, input.meals as any[], true);
    if (missing.length) return NextResponse.json({ error: "One or more foods are not in this catalog" }, { status: 400 });

    const created = await prisma.$transaction(async (tx) => {
      if (status === "ACTIVE") {
        await tx.mealPlan.updateMany({
          where: { clinicId, studentId, status: "ACTIVE" },
          data: { status: "PAUSED" },
        });
      }
      return tx.mealPlan.create({
        data: {
          clinicId,
          trainerId: actor.userId,
          studentId,
          name: input.name,
          status,
          targetKcal: input.targetKcal ?? null,
          targetProteinG: input.targetProteinG ?? null,
          targetCarbsG: input.targetCarbsG ?? null,
          targetFatG: input.targetFatG ?? null,
          notes: input.notes ?? null,
          meals: { create: input.meals.map((m, i) => mapMeal(m, i, foodMap)) },
        },
        include: { meals: { orderBy: { order: "asc" } } },
      });
    });

    if (body?.notifyStudent === true) await notifyPlanAssigned(studentId, created.name, false);

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/meal-plans] POST error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
