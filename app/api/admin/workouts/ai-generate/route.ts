export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, assertPatientAccess, accessErrorResponse, AccessError } from "@/lib/tenant-access";
import { assertTrainingAccess } from "@/lib/workout-access";
import { callAI } from "@/lib/ai-provider";
import { rateLimit } from "@/lib/rate-limit";
import {
  buildCatalogForPrompt,
  buildWorkoutPrompt,
  validateGeneratedWorkout,
  withTimeout,
  AITimeoutError,
  type CatalogExercise,
} from "@/lib/workout-ai";

const AI_TIMEOUT_MS = 30_000;
const clip = (s: unknown, max: number): string | undefined =>
  typeof s === "string" && s.trim() ? s.trim().slice(0, max) : undefined;
// M2: keep an out-of-range daysPerWeek from making the prompt read oddly.
const clampDays = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(7, Math.max(1, Math.round(v))) : undefined;

// POST — generates a workout DRAFT from the tenant's exercise catalog. Never
// persists anything; the trainer reviews it in the normal builder UI and saves
// it through the existing POST /api/admin/workouts (unchanged, already tested).
export async function POST(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = await assertTrainingAccess(actor);

    const body = await request.json().catch(() => null);
    const studentId = body?.studentId;
    if (!studentId) return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    await assertPatientAccess(actor, studentId); // 404 if not this tenant's student

    // Cost guard — per tenant, generous for real use (G-1a: shared across trainers).
    const rl = rateLimit(`ai-workout:${clinicId}`, { max: 20, windowMs: 24 * 60 * 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many AI generations today. Try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
      );
    }

    const exercises = await prisma.exercise.findMany({
      where: { clinicId, isActive: true, videoUrl: { not: null } },
      select: { id: true, name: true, namePt: true, bodyRegion: true, difficulty: true, tags: true, videoUrl: true, defaultSets: true, defaultReps: true, defaultRestSec: true },
    });
    if (exercises.length === 0) {
      return NextResponse.json({ error: "Add exercises with video to your library first." }, { status: 400 });
    }

    const catalog: CatalogExercise[] = exercises as CatalogExercise[];
    const focus = clip(body?.focus, 200);
    const { catalogText, usedExercises, usedFallback } = buildCatalogForPrompt(catalog, focus);
    const exerciseById = new Map(usedExercises.map((e) => [e.id, e]));

    const { systemPrompt, userPrompt } = buildWorkoutPrompt(
      { goal: clip(body?.goal, 300), level: clip(body?.level, 50), daysPerWeek: clampDays(body?.daysPerWeek), focus, notes: clip(body?.notes, 500) },
      catalogText
    );

    let raw: string;
    try {
      raw = await withTimeout(callAI(userPrompt, { systemPrompt, temperature: 0.6, maxTokens: 4096 }), AI_TIMEOUT_MS);
    } catch (err: any) {
      if (err instanceof AITimeoutError) {
        return NextResponse.json({ error: "AI is taking too long. Try again." }, { status: 504 });
      }
      console.error("[workouts/ai-generate] provider error:", err?.message);
      return NextResponse.json({ error: "AI request failed. Try again." }, { status: 502 });
    }

    let generated;
    try {
      generated = validateGeneratedWorkout(raw, exerciseById);
    } catch (err: any) {
      console.error("[workouts/ai-generate] invalid AI output:", err?.message, raw?.slice(0, 500));
      return NextResponse.json({ error: "AI generated invalid data. Try again." }, { status: 502 });
    }

    return NextResponse.json({ generated, usedFallbackCatalog: usedFallback });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[workouts/ai-generate] error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
