import { apiFetch } from "./client";

// ─── Achievements ───
export interface Achievement {
  id: string;
  name?: string;
  title?: string;
  description?: string | null;
  unlocked?: boolean;
  xp?: number;
  [key: string]: any;
}
export interface AchievementsData {
  achievements: Achievement[];
  totalUnlocked: number;
  totalXp: number;
  totalAchievements: number;
}
export function fetchAchievements(): Promise<AchievementsData> {
  return apiFetch<AchievementsData>("/api/patient/achievements");
}

// ─── Membership ───
export interface MembershipPlan {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  interval: string;
  isFree: boolean;
}
export async function fetchPlans(): Promise<MembershipPlan[]> {
  const res = await apiFetch<MembershipPlan[]>("/api/patient/membership/plans");
  return Array.isArray(res) ? res : [];
}
export function fetchSubscription(): Promise<{ subscription: any | null }> {
  return apiFetch<{ subscription: any | null }>("/api/patient/membership/subscription");
}

// ─── Quizzes ───
export interface Quiz {
  id: string;
  title?: string;
  [key: string]: any;
}
export async function fetchQuizzes(): Promise<Quiz[]> {
  const res = await apiFetch<{ quizzes: Quiz[] }>("/api/patient/quizzes");
  return res.quizzes ?? [];
}
