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
import { assertTrainingAccess } from "@/lib/workout-access";
import { epley1RM } from "@/lib/body-composition";

// ISO-week key (Mon-based) for grouping, e.g. "2026-W37".
function weekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// GET — a student's training progress (adherence, weekly volume, load evolution,
// recent sessions). Staff-only, tenant-scoped; the student must be in the tenant.
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertTrainingAccess(actor);

    const studentId = request.nextUrl.searchParams.get("studentId");
    if (!studentId) return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    await assertPatientAccess(actor, studentId); // 404 if not a patient of this tenant

    const scope = tenantWhere(actor);

    const workouts = await prisma.workout.findMany({
      where: { ...scope, studentId, isActive: true },
      select: { id: true, name: true, daysOfWeek: true },
    });

    const since = new Date(Date.now() - 8 * 7 * 86400000); // last 8 weeks
    // logs + assessments have no interdependency — fetch in parallel.
    const [logs, assessmentsDesc] = await Promise.all([
      prisma.workoutLog.findMany({
        where: { ...scope, studentId, performedAt: { gte: since } },
        include: { setLogs: true },
        orderBy: { performedAt: "desc" },
      }),
      prisma.studentAssessment.findMany({
        where: { ...scope, studentId },
        select: { performedAt: true, weightKg: true, bodyFatPct: true, girths: true },
        orderBy: { performedAt: "desc" }, // newest first, then take the latest 60
        take: 60,
      }),
    ]);

    // Name map for the workoutExercises that appear in the logs — queried by id
    // so it covers exercises from now-inactive workouts too (not just the active
    // set), and load-evolution can key by id (not name) to avoid collisions.
    const loggedWeIds = Array.from(new Set(logs.flatMap((l) => l.setLogs.map((s) => s.workoutExerciseId))));
    const wexRows = loggedWeIds.length
      ? await prisma.workoutExercise.findMany({
          where: { id: { in: loggedWeIds } },
          select: { id: true, exercise: { select: { name: true } } },
        })
      : [];
    const exName = new Map(wexRows.map((x) => [x.id, x.exercise?.name ?? "Exercise"]));

    // Only sets the student actually marked done count as performed work — sets
    // are pre-filled from the prescription, so presence of reps/load ≠ done.
    const doneSets = (l: (typeof logs)[number]) => l.setLogs.filter((s) => s.completed);

    // Adherence: planned sessions/week = sum of active workouts' scheduled days.
    const plannedPerWeek = workouts.reduce((n, w) => n + (w.daysOfWeek?.length || 0), 0);
    const fourWeeksAgo = Date.now() - 28 * 86400000;
    const doneLast4Weeks = logs.filter((l) => l.performedAt.getTime() >= fourWeeksAgo).length;

    // Weekly volume (Σ reps×load) over the window.
    const volByWeek = new Map<string, number>();
    for (const l of logs) {
      const wk = weekKey(l.performedAt);
      let v = volByWeek.get(wk) || 0;
      for (const s of doneSets(l)) v += (s.reps || 0) * (s.loadKg || 0);
      volByWeek.set(wk, Math.round(v));
    }
    const weeklyVolume = Array.from(volByWeek.entries())
      .map(([week, volume]) => ({ week, volume }))
      .sort((a, b) => (a.week < b.week ? -1 : 1));

    // Load evolution: per workoutExercise (keyed by id, not name), the top load
    // lifted in each session (chronological). Only completed sets.
    const loadMap = new Map<string, { date: string; topLoadKg: number }[]>();
    for (const l of [...logs].reverse()) {
      const perEx = new Map<string, number>();
      for (const s of doneSets(l)) {
        if (s.loadKg == null) continue;
        perEx.set(s.workoutExerciseId, Math.max(perEx.get(s.workoutExerciseId) ?? 0, s.loadKg));
      }
      for (const [weId, top] of perEx) {
        const arr = loadMap.get(weId) || [];
        arr.push({ date: l.performedAt.toISOString(), topLoadKg: top });
        loadMap.set(weId, arr);
      }
    }
    const loadByExercise = Array.from(loadMap.entries()).map(([weId, series]) => ({
      exerciseName: exName.get(weId) ?? "Exercise",
      series,
    }));

    // Estimated 1RM per exercise (Epley) — best completed set in the window.
    const bestRm = new Map<string, number>();
    for (const l of logs) {
      for (const s of doneSets(l)) {
        const rm = epley1RM(s.loadKg, s.reps);
        if (rm != null) bestRm.set(s.workoutExerciseId, Math.max(bestRm.get(s.workoutExerciseId) ?? 0, rm));
      }
    }
    // Aggregate 1RM by exercise NAME (max) so the same movement across two
    // workouts shows once — and the client can key by name without collisions.
    const rmByName = new Map<string, number>();
    for (const [weId, kg] of bestRm) {
      const name = exName.get(weId) ?? "Exercise";
      rmByName.set(name, Math.max(rmByName.get(name) ?? 0, kg));
    }
    const oneRepMax = Array.from(rmByName.entries())
      .map(([exerciseName, kg]) => ({ exerciseName, kg: Math.round(kg * 10) / 10 }))
      .sort((a, b) => b.kg - a.kg);

    // Body-composition curves (chronological — query was newest-first).
    const assessments = [...assessmentsDesc].reverse();
    const series = (pick: (a: (typeof assessments)[number]) => number | null | undefined) =>
      assessments
        .map((a) => ({ date: a.performedAt.toISOString(), v: pick(a) }))
        .filter((p): p is { date: string; v: number } => typeof p.v === "number");
    const composition = {
      weight: series((a) => a.weightKg),
      bodyFat: series((a) => a.bodyFatPct),
      waist: series((a) => (a.girths as any)?.waist),
    };

    // Recent sessions (most recent 20).
    const recent = logs.slice(0, 20).map((l) => {
      const done = doneSets(l);
      return {
        id: l.id,
        performedAt: l.performedAt.toISOString(),
        sessionRpe: l.sessionRpe,
        setCount: done.length,
        volume: Math.round(done.reduce((v, s) => v + (s.reps || 0) * (s.loadKg || 0), 0)),
      };
    });

    return NextResponse.json({
      adherence: { doneLast4Weeks, plannedLast4Weeks: plannedPerWeek * 4, plannedPerWeek },
      weeklyVolume,
      loadByExercise,
      oneRepMax,
      composition,
      recent,
    });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/workouts/progress] GET error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
