import { apiFetch } from "./client";

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
  const res = await apiFetch<{ schedule: ScheduleDay[] }>("/api/public/schedule");
  return res.schedule ?? [];
}
