import { prisma } from "@/lib/db";
import type { ChallengeMetric } from "@prisma/client";

// Challenge progress + leaderboard + streaks for the personal-trainer product
// (activity 29). Everything is computed ON-READ from the existing WorkoutLog /
// MealLog. Day boundaries are UTC (aligned with the nutrition adherence already
// in prod, which stores MealLog.loggedDate as a UTC date-only). Leaderboard is
// one query per challenge (no N+1).

export interface ChallengeInput {
  title: string;
  metric: ChallengeMetric;
  target: number;
  startsAt: string | Date;
  endsAt: string | Date;
}

const MAX_TARGET = 1000;
const METRICS: ChallengeMetric[] = ["WORKOUT_COUNT", "MEAL_LOG_DAYS"];

/** Validates a challenge payload. Returns an error message or null. */
export function validateChallenge(input: ChallengeInput): string | null {
  if (!input || typeof input.title !== "string" || input.title.trim() === "") return "Title is required";
  if (input.title.length > 200) return "Title is too long";
  if (!METRICS.includes(input.metric)) return "Metric is invalid";
  if (typeof input.target !== "number" || !Number.isInteger(input.target) || input.target < 1) return "Target must be at least 1";
  if (input.target > MAX_TARGET) return "Target is too high";
  const s = new Date(input.startsAt).getTime();
  const e = new Date(input.endsAt).getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e)) return "Invalid dates";
  if (e <= s) return "End date must be after the start date";
  return null;
}

const utcDayKey = (d: Date): string => d.toISOString().slice(0, 10);

/**
 * Progress for many students at once (one query per challenge, no N+1).
 * WORKOUT_COUNT = workout sessions with ≥1 completed set in the window.
 * MEAL_LOG_DAYS = distinct days with a meal logged in the window.
 */
export async function progressForMany(
  metric: ChallengeMetric,
  studentIds: string[],
  clinicId: string,
  startsAt: Date,
  endsAt: Date
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (studentIds.length === 0) return out;

  if (metric === "WORKOUT_COUNT") {
    const rows = await prisma.workoutLog.findMany({
      where: {
        clinicId,
        studentId: { in: studentIds },
        performedAt: { gte: startsAt, lte: endsAt },
        setLogs: { some: { completed: true } },
      },
      select: { studentId: true },
    });
    for (const r of rows) out.set(r.studentId, (out.get(r.studentId) || 0) + 1);
    return out;
  }

  // MEAL_LOG_DAYS — distinct (studentId, day).
  const rows = await prisma.mealLog.findMany({
    where: { clinicId, studentId: { in: studentIds }, loggedDate: { gte: startsAt, lte: endsAt } },
    select: { studentId: true, loggedDate: true },
  });
  const seen = new Map<string, Set<string>>();
  for (const r of rows) {
    const set = seen.get(r.studentId) || new Set<string>();
    set.add(utcDayKey(r.loggedDate));
    seen.set(r.studentId, set);
  }
  for (const [sid, days] of seen) out.set(sid, days.size);
  return out;
}

export interface LeaderboardEntry {
  studentId: string;
  displayName: string;
  progress: number;
  target: number;
  pct: number;
  completed: boolean;
}

interface ParticipantWithName {
  studentId: string;
  joinedAt: Date;
  completedAt: Date | null;
  student: { firstName: string; lastName: string | null };
}

/** "First name + last initial" — privacy-friendly leaderboard name (G6). */
function displayName(first: string, last: string | null): string {
  const initial = last?.trim()?.[0];
  return initial ? `${first} ${initial.toUpperCase()}.` : first;
}

/** Ranked leaderboard for a challenge (one query for all participants). */
export async function leaderboard(
  challenge: { clinicId: string; metric: ChallengeMetric; target: number; startsAt: Date; endsAt: Date },
  participants: ParticipantWithName[]
): Promise<LeaderboardEntry[]> {
  const ids = participants.map((p) => p.studentId);
  const progress = await progressForMany(challenge.metric, ids, challenge.clinicId, challenge.startsAt, challenge.endsAt);

  const entries = participants.map((p) => {
    const prog = progress.get(p.studentId) || 0;
    return {
      studentId: p.studentId,
      displayName: displayName(p.student.firstName, p.student.lastName),
      progress: prog,
      target: challenge.target,
      pct: challenge.target > 0 ? Math.min(1, prog / challenge.target) : 0,
      completed: p.completedAt != null || prog >= challenge.target,
      _joinedAt: p.joinedAt,
      _completedAt: p.completedAt,
    };
  });

  entries.sort((a, b) => {
    if (b.progress !== a.progress) return b.progress - a.progress;
    const ac = a._completedAt?.getTime() ?? Infinity;
    const bc = b._completedAt?.getTime() ?? Infinity;
    if (ac !== bc) return ac - bc;
    return a._joinedAt.getTime() - b._joinedAt.getTime();
  });

  return entries.map(({ _joinedAt, _completedAt, ...e }) => e);
}

/**
 * Current consistency streak (consecutive days ending today or yesterday, UTC).
 * kind "workout" = days with a completed-set workout; "meal" = days with a meal log.
 */
export async function currentStreak(
  kind: "workout" | "meal",
  studentId: string,
  clinicId: string
): Promise<number> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 90);
  const days = new Set<string>();

  if (kind === "workout") {
    const rows = await prisma.workoutLog.findMany({
      where: { clinicId, studentId, performedAt: { gte: since }, setLogs: { some: { completed: true } } },
      select: { performedAt: true },
    });
    for (const r of rows) days.add(utcDayKey(r.performedAt));
  } else {
    const rows = await prisma.mealLog.findMany({
      where: { clinicId, studentId, loggedDate: { gte: since } },
      select: { loggedDate: true },
    });
    for (const r of rows) days.add(utcDayKey(r.loggedDate));
  }
  if (days.size === 0) return 0;

  // Start from today; allow a grace day (yesterday) if today isn't logged yet.
  const cursor = new Date();
  const todayKey = utcDayKey(cursor);
  if (!days.has(todayKey)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (!days.has(utcDayKey(cursor))) return 0;
  }
  let streak = 0;
  while (days.has(utcDayKey(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
