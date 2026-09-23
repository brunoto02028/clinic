import { apiFetch } from "./client";
import { useAuth } from "@/store/auth";

export interface BookingRequest {
  dateTime: string;
  duration?: number;
  treatmentType: string;
  notes?: string;
}

export async function bookAppointment(data: BookingRequest) {
  return apiFetch<{ success: boolean; appointment: any }>("/api/appointments", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export interface AvailabilityResult {
  slots: string[];
  available: boolean;
  workingHours?: { start: string; end: string };
  therapistId?: string;
  reason?: string;
}

export async function fetchAvailability(date: string): Promise<AvailabilityResult> {
  return apiFetch<AvailabilityResult>(`/api/availability?date=${date}`);
}

export interface ScheduleDay {
  day: string;
  dayOfWeek: number;
  open: string;
  close: string;
  closed: boolean;
}

export async function fetchSchedule(): Promise<ScheduleDay[]> {
  // Scoped to the patient's own clinic. Without the slug the endpoint falls
  // back to the default tenant, so a patient of any other clinic was offered
  // the wrong opening hours — and the app is multi-tenant.
  const slug = useAuth.getState().user?.clinicSlug;
  const res = await apiFetch<{ schedule: ScheduleDay[] }>(
    `/api/public/schedule${slug ? `?clinic=${encodeURIComponent(slug)}` : ""}`
  );
  return res.schedule ?? [];
}
