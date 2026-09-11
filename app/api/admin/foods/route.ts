export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, tenantWhere, accessErrorResponse, AccessError } from "@/lib/tenant-access";
import { assertNutritionAccess } from "@/lib/nutrition-access";
import { validateFood, type FoodInput } from "@/lib/food";
import type { FoodBasis } from "@prisma/client";

// GET — the tenant's active food catalog.
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertNutritionAccess(actor);

    const foods = await prisma.food.findMany({
      where: { ...tenantWhere(actor), isActive: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(foods);
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/foods] GET error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}

// POST — add a food to the catalog.
export async function POST(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = await assertNutritionAccess(actor);

    const body = await request.json().catch(() => null);
    const input: FoodInput = {
      name: typeof body?.name === "string" ? body.name.trim() : "",
      basis: body?.basis as FoodBasis,
      unitLabel: typeof body?.unitLabel === "string" ? body.unitLabel.trim() : undefined,
      kcal: Number(body?.kcal),
      proteinG: Number(body?.proteinG),
      carbsG: Number(body?.carbsG),
      fatG: Number(body?.fatG),
    };
    const vErr = validateFood(input);
    if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });

    const food = await prisma.food.create({
      data: {
        clinicId,
        name: input.name,
        basis: input.basis,
        unitLabel: input.unitLabel || (input.basis === "PER_100G" ? "100g" : "unit"),
        kcal: input.kcal,
        proteinG: input.proteinG,
        carbsG: input.carbsG,
        fatG: input.fatG,
      },
    });
    return NextResponse.json(food, { status: 201 });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/foods] POST error:", (err as any)?.message);
    return NextResponse.json({ error: "Could not create the food" }, { status: 500 });
  }
}
