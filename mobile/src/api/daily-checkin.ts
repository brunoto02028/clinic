import { apiFetch } from "./client";

/**
 * `day` é o registro de quem não escolheu período — e é o que todo registro
 * anterior a 26/09/2026 tem. Eles descrevem o dia, sem dizer a hora.
 */
export type PeriodoDoDia = "day" | "morning" | "afternoon" | "evening";

export interface CheckIn {
  id: string;
  checkinDate: string;
  period: PeriodoDoDia;
  painLevel: number;
  moodLevel: number;
  energyLevel: number | null;
  sleepQuality: number | null;
  stressLevel: number | null;
  exercisesDone: boolean;
  notes: string | null;
}

export interface PatientProgress {
  streakDays: number;
  longestStreak: number;
  xp: number;
  level: number;
  levelTitle: string;
  totalXpEarned: number;
}

export interface StreakResult {
  current: number;
  longest: number;
  isNewRecord: boolean;
}

export async function submitCheckIn(data: {
  /**
   * O dia que este registro descreve, `YYYY-MM-DD`. Ausente significa hoje.
   * O servidor recusa o futuro e recusa mais de catorze dias atrás.
   */
  checkinDate?: string;
  /**
   * Manhã, tarde ou noite. O Bruno: *"pode piorar de manhã à noite"* — e os
   * dois são fatos, não um sobrescrevendo o outro.
   */
  period?: PeriodoDoDia;
  painLevel: number;
  moodLevel: number;
  energyLevel?: number;
  sleepQuality?: number;
  stressLevel?: number;
  exercisesDone: boolean;
  notes?: string;
}) {
  return apiFetch<{ checkIn: CheckIn; xpAwarded?: number; streak: StreakResult }>("/api/patient/daily-checkin", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchCheckIns() {
  return apiFetch<{
    today: CheckIn | null;
    /** Todos os de hoje — manhã, tarde e noite podem coexistir. */
    todayAll: CheckIn[];
    history: CheckIn[];
    todayDate: string;
    progress: PatientProgress | null;
  }>("/api/patient/daily-checkin");
}
