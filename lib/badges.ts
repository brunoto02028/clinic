import { prisma } from "@/lib/db";
import { currentStreak } from "@/lib/challenges";

// Achievement badges for the personal-trainer product (activity 30). Badges are
// DERIVED ON-READ from existing signals (WorkoutLog / MealLog / completed
// challenges / streaks) — no table, no migration, nothing persisted. The
// clinical BPR Journey badge stack is separate and untouched.

export type BadgeMetric =
  | "totalWorkouts"
  | "mealDays"
  | "workoutStreak"
  | "mealStreak"
  | "completedChallenges";

export interface BadgeDef {
  key: string;
  emoji: string;
  label: string;
  labelPt: string;
  description: string;
  descriptionPt: string;
  metric: BadgeMetric;
  threshold: number;
}

export const BADGE_CATALOG: BadgeDef[] = [
  { key: "first_workout", emoji: "💪", label: "First Workout", labelPt: "Primeiro Treino", description: "Logged your first workout", descriptionPt: "Registrou o primeiro treino", metric: "totalWorkouts", threshold: 1 },
  { key: "workouts_10", emoji: "🔟", label: "10 Workouts", labelPt: "10 Treinos", description: "Logged 10 workouts", descriptionPt: "Registrou 10 treinos", metric: "totalWorkouts", threshold: 10 },
  { key: "workouts_50", emoji: "🏋️", label: "50 Workouts", labelPt: "50 Treinos", description: "Logged 50 workouts", descriptionPt: "Registrou 50 treinos", metric: "totalWorkouts", threshold: 50 },
  { key: "streak_7", emoji: "🔥", label: "7-Day Streak", labelPt: "Sequência de 7 dias", description: "7-day workout streak", descriptionPt: "7 dias de treino seguidos", metric: "workoutStreak", threshold: 7 },
  { key: "streak_30", emoji: "⚡", label: "30-Day Streak", labelPt: "Sequência de 30 dias", description: "30-day workout streak", descriptionPt: "30 dias de treino seguidos", metric: "workoutStreak", threshold: 30 },
  { key: "meal_days_20", emoji: "🥗", label: "Nutrition Habit", labelPt: "Hábito Nutricional", description: "20 days with a meal logged", descriptionPt: "20 dias com refeição registrada", metric: "mealDays", threshold: 20 },
  { key: "challenge_1", emoji: "🏆", label: "Challenger", labelPt: "Desafiante", description: "Completed a challenge", descriptionPt: "Completou um desafio", metric: "completedChallenges", threshold: 1 },
  { key: "challenge_3", emoji: "🥇", label: "Champion", labelPt: "Campeão", description: "Completed 3 challenges", descriptionPt: "Completou 3 desafios", metric: "completedChallenges", threshold: 3 },
];

export interface BadgeSignals {
  totalWorkouts: number;
  mealDays: number;
  workoutStreak: number;
  mealStreak: number;
  completedChallenges: number;
}

export interface EarnedBadge extends BadgeDef {
  value: number;
  earned: boolean;
  progress: number;
}

/** Pure: maps the catalog against the signals. */
export function earnedBadges(signals: BadgeSignals): EarnedBadge[] {
  return BADGE_CATALOG.map((b) => {
    const value = signals[b.metric] ?? 0;
    return {
      ...b,
      value,
      earned: value >= b.threshold,
      progress: b.threshold > 0 ? Math.min(1, value / b.threshold) : 0,
    };
  });
}

const utcDayKey = (d: Date): string => d.toISOString().slice(0, 10);

/** Aggregates the five badge signals for a student (all-time counts + streaks). */
export async function computeSignals(studentId: string, clinicId: string): Promise<BadgeSignals> {
  const [totalWorkouts, mealRows, workoutStreak, mealStreak, completedChallenges] = await Promise.all([
    prisma.workoutLog.count({ where: { clinicId, studentId, setLogs: { some: { completed: true } } } }),
    prisma.mealLog.findMany({ where: { clinicId, studentId }, select: { loggedDate: true } }),
    currentStreak("workout", studentId, clinicId),
    currentStreak("meal", studentId, clinicId),
    prisma.challengeParticipant.count({ where: { clinicId, studentId, completedAt: { not: null } } }),
  ]);
  const mealDays = new Set(mealRows.map((r) => utcDayKey(r.loggedDate))).size;
  return { totalWorkouts, mealDays, workoutStreak, mealStreak, completedChallenges };
}
