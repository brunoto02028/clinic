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
  try {
    return await apiFetch<{ notifications: Notification[]; unreadCount: number }>("/api/patient/notifications");
  } catch {
    return { notifications: [], unreadCount: 0 };
  }
}

export async function fetchAICoachTip(): Promise<{ tip: string; title: string } | null> {
  try {
    return await apiFetch<{ tip: string; title: string }>("/api/patient/ai-coach");
  } catch {
    return null;
  }
}
