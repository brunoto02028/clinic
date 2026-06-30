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
