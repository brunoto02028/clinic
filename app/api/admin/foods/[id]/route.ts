export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, assertRecordAccess, accessErrorResponse, AccessError } from "@/lib/tenant-access";
import { assertNutritionAccess } from "@/lib/nutrition-access";
import { validateFood, computeMealMacros, type FoodInput } from "@/lib/food";
import type { FoodBasis } from "@prisma/client";

async function loadOwned(actor: Awaited<ReturnType<typeof getActor>>, id: string) {
  const food = await prisma.food.findUnique({ where: { id } });
  assertRecordAccess(actor!, { clinicId: food?.clinicId ?? null });
  return food!;
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Recompute + persist Meal macros for every meal that uses this food (G1). */
async function recomputeMealsUsing(tx: Tx, foodId: string) {
  const affected = await tx.mealFood.findMany({ where: { foodId }, select: { mealId: true }, distinct: ["mealId"] });
  for (const { mealId } of affected) {
    const items = await tx.mealFood.findMany({
      where: { mealId },
      include: { food: { select: { basis: true, kcal: true, proteinG: true, carbsG: true, fatG: true } } },
    });
    const totals = computeMealMacros(items.map((i) => ({ food: i.food, quantity: i.quantity })));
    await tx.meal.update({ where: { id: mealId }, data: totals });
  }
}

// PATCH — edit a food; if macros/basis change, recompute meals that use it.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertNutritionAccess(actor);
    const food = await loadOwned(actor, params.id);

    const body = await request.json().catch(() => null);
    const input: FoodInput = {
      name: typeof body?.name === "string" && body.name.trim() ? body.name.trim() : food.name,
      basis: (body?.basis as FoodBasis) || food.basis,
      unitLabel: typeof body?.unitLabel === "string" ? body.unitLabel.trim() : food.unitLabel,
      kcal: typeof body?.kcal === "number" ? body.kcal : food.kcal,
      proteinG: typeof body?.proteinG === "number" ? body.proteinG : food.proteinG,
      carbsG: typeof body?.carbsG === "number" ? body.carbsG : food.carbsG,
      fatG: typeof body?.fatG === "number" ? body.fatG : food.fatG,
    };
    const vErr = validateFood(input);
    if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });

    const macrosChanged =
      input.basis !== food.basis || input.kcal !== food.kcal || input.proteinG !== food.proteinG ||
      input.carbsG !== food.carbsG || input.fatG !== food.fatG;

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.food.update({
        where: { id: food.id },
        data: { name: input.name, basis: input.basis, unitLabel: input.unitLabel, kcal: input.kcal, proteinG: input.proteinG, carbsG: input.carbsG, fatG: input.fatG },
      });
      if (macrosChanged) await recomputeMealsUsing(tx, food.id);
      return u;
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/foods/[id]] PATCH error:", (err as any)?.message);
    return NextResponse.json({ error: "Could not update the food" }, { status: 500 });
  }
}

// DELETE — soft-delete (isActive=false). Existing meals keep their linked food
// and stored macros; the food just disappears from the picker.
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertNutritionAccess(actor);
    await loadOwned(actor, params.id);
    await prisma.food.update({ where: { id: params.id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/foods/[id]] DELETE error:", (err as any)?.message);
    return NextResponse.json({ error: "Could not delete the food" }, { status: 500 });
  }
}
