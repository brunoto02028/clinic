export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";
import { getMobileActor } from "@/lib/mobile-actor";
import { assertStudentNutritionAccess, assertMealPlanForStudent } from "@/lib/nutrition-access";
import { AccessError } from "@/lib/tenant-access";

export function OPTIONS() {
  return corsPreflight();
}

function toLoggedDate(raw: unknown): Date {
  const s = typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : new Date().toISOString().slice(0, 10);
  return new Date(`${s}T00:00:00.000Z`);
}

// POST — student marks a planned meal done for a day (idempotent per student/meal/day).
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await getMobileActor(request);
    if (!actor) return corsJson({ error: "Unauthorized" }, { status: 401 });
    await assertStudentNutritionAccess(actor);
    const plan = await assertMealPlanForStudent(actor, params.id);
    if (plan.status !== "ACTIVE") throw new AccessError(404, "Not found");

    const body = await request.json().catch(() => null);
    const mealId = body?.mealId;
    if (!mealId || typeof mealId !== "string") return corsJson({ error: "mealId is required" }, { status: 400 });

    const meal = await prisma.meal.findFirst({ where: { id: mealId, mealPlanId: plan.id }, select: { id: true, name: true } });
    if (!meal) return corsJson({ error: "Meal not found in this plan" }, { status: 400 });

    const loggedDate = toLoggedDate(body?.date);
    const note = typeof body?.note === "string" ? body.note.slice(0, 2000) : null;
    const photoUrl = typeof body?.photoUrl === "string" ? body.photoUrl : null;

    const log = await prisma.mealLog.upsert({
      where: { studentId_mealId_loggedDate: { studentId: actor.userId, mealId: meal.id, loggedDate } },
      create: { clinicId: plan.clinicId, mealPlanId: plan.id, mealId: meal.id, studentId: actor.userId, mealName: meal.name, loggedDate, note, photoUrl },
      update: { note, photoUrl, performedAt: new Date() },
    });
    return corsJson(log, { status: 201 });
  } catch (err) {
    if (err instanceof AccessError) return corsJson({ error: err.message }, { status: err.status });
    console.error("[mobile/meal-plans/[id]/logs] POST error:", (err as any)?.message);
    return corsJson({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}

// DELETE — unmark a meal for a day (?mealId=&date=).
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await getMobileActor(request);
    if (!actor) return corsJson({ error: "Unauthorized" }, { status: 401 });
    await assertStudentNutritionAccess(actor);
    const plan = await assertMealPlanForStudent(actor, params.id);

    const mealId = request.nextUrl.searchParams.get("mealId");
    if (!mealId) return corsJson({ error: "mealId is required" }, { status: 400 });
    const loggedDate = toLoggedDate(request.nextUrl.searchParams.get("date"));

    await prisma.mealLog.deleteMany({ where: { mealPlanId: plan.id, studentId: actor.userId, mealId, loggedDate } });
    return corsJson({ success: true });
  } catch (err) {
    if (err instanceof AccessError) return corsJson({ error: err.message }, { status: err.status });
    console.error("[mobile/meal-plans/[id]/logs] DELETE error:", (err as any)?.message);
    return corsJson({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
