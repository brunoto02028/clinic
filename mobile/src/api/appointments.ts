import { apiFetch } from "./client";

export interface Appointment {
  id: string;
  dateTime: string;
  treatmentType: string;
  status: string;
  duration: number;
  price: number;
  notes: string | null;
  therapist: { firstName: string; lastName: string } | null;
}

export async function fetchAppointments(): Promise<Appointment[]> {
  const res = await apiFetch<{ appointments: Appointment[] }>("/api/appointments");
  return res.appointments ?? [];
}

export async function fetchAppointment(id: string): Promise<Appointment> {
  const res = await apiFetch<any>(`/api/appointments/${id}`);
  // Endpoint may return the object directly or wrapped; normalize and validate.
  const appt = res?.appointment ?? res;
  if (!appt || !appt.id) {
    throw new Error("Agendamento não encontrado");
  }
  return appt as Appointment;
}

/** Next upcoming appointment (status not cancelled, in the future), or null. */
export function nextUpcoming(appointments: Appointment[]): Appointment | null {
  const now = Date.now();
  const upcoming = appointments
    .filter(
      (a) =>
        new Date(a.dateTime).getTime() >= now &&
        a.status?.toUpperCase() !== "CANCELLED"
    )
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  return upcoming[0] ?? null;
}
