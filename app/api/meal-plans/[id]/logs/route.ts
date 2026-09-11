export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, accessErrorResponse, AccessError } from "@/lib/tenant-access";
import { assertStudentNutritionAccess, assertMealPlanForStudent } from "@/lib/nutrition-access";

/** Normalizes an optional YYYY-MM-DD to a UTC date-only Date; defaults to today. */
function toLoggedDate(raw: unknown): Date {
  const s = typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : new Date().toISOString().slice(0, 10);
  return new Date(`${s}T00:00:00.000Z`);
}

// POST — the student marks a planned meal as done for a day. Idempotent per
// (student, meal, day): marking twice updates rather than duplicates.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertStudentNutritionAccess(actor);
    const plan = await assertMealPlanForStudent(actor, params.id);
    if (plan.status !== "ACTIVE") throw new AccessError(404, "Not found");

    const body = await request.json().catch(() => null);
    const mealId = body?.mealId;
    if (!mealId || typeof mealId !== "string") return NextResponse.json({ error: "mealId is required" }, { status: 400 });

    // The meal must belong to this plan.
    const meal = await prisma.meal.findFirst({ where: { id: mealId, mealPlanId: plan.id }, select: { id: true, name: true } });
    if (!meal) return NextResponse.json({ error: "Meal not found in this plan" }, { status: 400 });

    const loggedDate = toLoggedDate(body?.date);
    const note = typeof body?.note === "string" ? body.note.slice(0, 2000) : null;
    const photoUrl = typeof body?.photoUrl === "string" ? body.photoUrl : null;

    const log = await prisma.mealLog.upsert({
      where: { studentId_mealId_loggedDate: { studentId: actor.userId, mealId: meal.id, loggedDate } },
      create: {
        clinicId: plan.clinicId,
        mealPlanId: plan.id,
        mealId: meal.id,
        studentId: actor.userId,
        mealName: meal.name,
        loggedDate,
        note,
        photoUrl,
      },
      update: { note, photoUrl, performedAt: new Date() },
    });
    return NextResponse.json(log, { status: 201 });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[meal-plans/[id]/logs] POST error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}

// DELETE — unmark a meal for a day (?mealId=&date=YYYY-MM-DD, date defaults today).
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertStudentNutritionAccess(actor);
    const plan = await assertMealPlanForStudent(actor, params.id);

    const mealId = request.nextUrl.searchParams.get("mealId");
    if (!mealId) return NextResponse.json({ error: "mealId is required" }, { status: 400 });
    const loggedDate = toLoggedDate(request.nextUrl.searchParams.get("date"));

    await prisma.mealLog.deleteMany({
      where: { mealPlanId: plan.id, studentId: actor.userId, mealId, loggedDate },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[meal-plans/[id]/logs] DELETE error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}

// GET — the student's logs for this plan (most recent first).
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertStudentNutritionAccess(actor);
    const plan = await assertMealPlanForStudent(actor, params.id);

    const logs = await prisma.mealLog.findMany({
      where: { mealPlanId: plan.id, studentId: actor.userId },
      orderBy: { performedAt: "desc" },
      take: 200,
    });
    return NextResponse.json(logs);
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[meal-plans/[id]/logs] GET error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
