export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getActor,
  assertRecordAccess,
  accessErrorResponse,
  AccessError,
} from "@/lib/tenant-access";
import { assertNutritionAccess } from "@/lib/nutrition-access";
import { validateMealPlan, type MealInput, type MealPlanInput } from "@/lib/nutrition";
import { notifyPatient } from "@/lib/notify-patient";
import { loadFoodMap, mealMacroFields, mealFoodCreate, foodsProvided, type FoodMap } from "@/lib/meal-food-build";

const STATUSES = ["ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"] as const;
type Status = (typeof STATUSES)[number];

type MealInputWithId = MealInput & { id?: string; foods?: any[] };

// Scalars + macros for a meal: macros are computed from foods when present, else
// the manual values (activity 27). foods themselves are (re)linked separately.
function mealScalars(m: MealInputWithId, i: number, foodMap: FoodMap) {
  const macros = mealMacroFields(m as any, foodMap);
  return {
    name: m.name.trim(),
    timeOfDay: m.timeOfDay ?? null,
    description: m.description ?? null,
    kcal: macros.kcal,
    proteinG: macros.proteinG,
    carbsG: macros.carbsG,
    fatG: macros.fatG,
    order: typeof m.order === "number" ? m.order : i,
  };
}

/** Loads a plan and asserts it belongs to the actor's tenant (404 otherwise). */
async function loadOwned(actor: Awaited<ReturnType<typeof getActor>>, id: string) {
  const plan = await prisma.mealPlan.findUnique({
    where: { id },
    select: { id: true, clinicId: true, studentId: true },
  });
  assertRecordAccess(actor!, { clinicId: plan?.clinicId ?? null });
  return plan!;
}

// GET — one plan with meals + logs.
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertNutritionAccess(actor);
    await loadOwned(actor, params.id);

    const plan = await prisma.mealPlan.findUnique({
      where: { id: params.id },
      include: {
        meals: { orderBy: { order: "asc" }, include: { foods: { orderBy: { order: "asc" }, include: { food: true } } } },
        logs: {
          orderBy: { performedAt: "desc" },
          select: { id: true, mealId: true, mealName: true, loggedDate: true, performedAt: true, note: true, photoUrl: true },
        },
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return NextResponse.json(plan);
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/meal-plans/[id]] GET error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}

// PUT — update plan fields/status and upsert meals by id (preserving the ids
// that existing MealLogs point at, so adherence history survives edits).
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = await assertNutritionAccess(actor);
    const owned = await loadOwned(actor, params.id);

    const body = await request.json().catch(() => null);
    const hasMeals = Array.isArray(body?.meals);

    // Validate the full payload only when meals are provided (create/edit form);
    // a status-only PUT skips meal validation.
    if (hasMeals) {
      const input: MealPlanInput = {
        name: typeof body?.name === "string" ? body.name.trim() : "",
        targetKcal: body?.targetKcal ?? null,
        targetProteinG: body?.targetProteinG ?? null,
        targetCarbsG: body?.targetCarbsG ?? null,
        targetFatG: body?.targetFatG ?? null,
        notes: body?.notes ?? null,
        meals: body.meals,
      };
      const vErr = validateMealPlan(input);
      if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });
    } else if (typeof body?.name === "string" && body.name.trim() === "") {
      return NextResponse.json({ error: "Plan name is required" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (typeof body?.name === "string" && body.name.trim()) data.name = body.name.trim();
    if ("targetKcal" in (body || {})) data.targetKcal = body.targetKcal ?? null;
    if ("targetProteinG" in (body || {})) data.targetProteinG = body.targetProteinG ?? null;
    if ("targetCarbsG" in (body || {})) data.targetCarbsG = body.targetCarbsG ?? null;
    if ("targetFatG" in (body || {})) data.targetFatG = body.targetFatG ?? null;
    if ("notes" in (body || {})) data.notes = body.notes ?? null;
    const status: Status | undefined = STATUSES.includes(body?.status) ? body.status : undefined;
    if (status) data.status = status;

    // Resolve catalog foods referenced by the meals (tenant-scoped; PUT allows an
    // already-linked inactive food to be re-sent — G2).
    let foodMap: FoodMap = new Map();
    if (hasMeals) {
      const res = await loadFoodMap(clinicId, body.meals as any[], false);
      if (res.missing.length) return NextResponse.json({ error: "One or more foods are not in this catalog" }, { status: 400 });
      foodMap = res.map;
    }

    await prisma.$transaction(async (tx) => {
      // One ACTIVE plan per student: activating this one pauses the others.
      if (status === "ACTIVE") {
        await tx.mealPlan.updateMany({
          where: { clinicId, studentId: owned.studentId, status: "ACTIVE", id: { not: params.id } },
          data: { status: "PAUSED" },
        });
      }

      if (hasMeals) {
        const incoming: MealInputWithId[] = body.meals;
        const existing = await tx.meal.findMany({ where: { mealPlanId: params.id }, select: { id: true } });
        const existingIds = new Set(existing.map((m) => m.id));
        const keptIds = new Set<string>();

        for (let i = 0; i < incoming.length; i++) {
          const m = incoming[i];
          let mealId: string;
          if (m.id && existingIds.has(m.id)) {
            keptIds.add(m.id);
            await tx.meal.update({ where: { id: m.id }, data: mealScalars(m, i, foodMap) });
            mealId = m.id;
          } else {
            const createdMeal = await tx.meal.create({ data: { mealPlanId: params.id, ...mealScalars(m, i, foodMap) } });
            mealId = createdMeal.id;
          }
          // foods key present (incl. []) → replace the meal's foods; absent → leave.
          if (foodsProvided(m as any)) {
            await tx.mealFood.deleteMany({ where: { mealId } });
            const rows = mealFoodCreate(m as any);
            if (rows.length) await tx.mealFood.createMany({ data: rows.map((r) => ({ ...r, mealId })) });
          }
        }
        // Remove only meals dropped from the plan; their MealLogs keep the
        // snapshot and have mealId set to null (onDelete: SetNull). MealFood
        // rows cascade-delete with the meal.
        const toDelete = [...existingIds].filter((id) => !keptIds.has(id));
        if (toDelete.length) await tx.meal.deleteMany({ where: { id: { in: toDelete } } });
      }

      if (Object.keys(data).length) await tx.mealPlan.update({ where: { id: params.id }, data });
    });

    const updated = await prisma.mealPlan.findUnique({
      where: { id: params.id },
      include: { meals: { orderBy: { order: "asc" } } },
    });

    if (body?.notifyStudent === true && updated) {
      try {
        await notifyPatient({
          patientId: owned.studentId,
          plainMessage: `Your trainer updated your meal plan "${updated.name}". Open the Nutrition tab to see it.`,
          plainMessagePt: `Seu personal atualizou seu plano alimentar "${updated.name}". Abra a aba Nutrição para ver.`,
        });
      } catch (err) {
        console.error("[admin/meal-plans/[id]] notify error:", (err as any)?.message);
      }
    }

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/meal-plans/[id]] PUT error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}

// DELETE — remove a plan (cascades to its meals and logs). Snapshot preservation
// (mealId → null) applies when a single meal is dropped from a living plan, not
// when the whole plan is deleted.
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertNutritionAccess(actor);
    await loadOwned(actor, params.id);

    await prisma.mealPlan.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/meal-plans/[id]] DELETE error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
