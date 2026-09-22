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

export interface SubscribeResult {
  checkoutUrl?: string; // present when Stripe checkout is required
  subscription?: any; // present when activated directly (free / manual mode)
  message?: string;
}
export function subscribeToPlan(planId: string): Promise<SubscribeResult> {
  return apiFetch<SubscribeResult>("/api/patient/membership/subscribe", {
    method: "POST",
    headers: { "x-platform": "mobile" },
    body: JSON.stringify({ planId }),
  });
}

export function cancelSubscription(): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/api/patient/membership/cancel", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

// ─── Quizzes ───
export interface Quiz {
  id: string;
  /** The model has `titleEn`/`titlePt`; there is no `title` column. The screen
   *  read `item.title`, which was always undefined, so every card fell back to
   *  the literal "Quiz" — a list of identical rows. */
  titleEn?: string;
  titlePt?: string;
  [key: string]: any;
}

/** The quiz title in the patient's language, falling back across the pair. */
export function quizTitle(q: Quiz, locale = "pt"): string {
  const pt = q.titlePt?.trim();
  const en = q.titleEn?.trim();
  return (locale.startsWith("pt") ? pt || en : en || pt) || "Quiz";
}
export async function fetchQuizzes(): Promise<Quiz[]> {
  const res = await apiFetch<{ quizzes: Quiz[] }>("/api/patient/quizzes");
  return res.quizzes ?? [];
}
