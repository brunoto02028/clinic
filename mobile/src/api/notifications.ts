import { apiFetch } from "./client";

export interface Notification {
  id: string;
  type: string;
  title: string;
  titlePt?: string;
  message: string;
  messagePt?: string;
  link?: string;
  icon?: string;
  color?: string;
  createdAt: string;
  isUrgent?: boolean;
}

export async function fetchNotifications(): Promise<{ notifications: Notification[]; unreadCount: number }> {
  // No catch. Swallowing the failure into an empty list made the query
  // incapable of erroring, so a patient whose notifications failed to load
  // read "All caught up — nothing pending". That is a statement about their
  // care, not a loading state, and it was false.
  return apiFetch<{ notifications: Notification[]; unreadCount: number }>("/api/patient/notifications");
}

export async function fetchAICoachTip(): Promise<{ tip: string; title: string } | null> {
  try {
    return await apiFetch<{ tip: string; title: string }>("/api/patient/ai-coach");
  } catch {
    return null;
  }
}
