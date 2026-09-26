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

/** Um horário com o que a clínica configurou para ele. */
export interface DetailedSlot {
  time: string;
  kind: "CONSULTATION" | "TREATMENT";
  capacity: number;
  taken: number;
  /** O que o paciente lê. Nunca **quem** ocupa as outras vagas. */
  spacesLeft: number;
}

export interface AvailabilityResult {
  slots: string[];
  /** Só vem quando a clínica configurou janelas (atividade 080, T-5). */
  detailedSlots?: DetailedSlot[];
  configured?: boolean;
  available: boolean;
  workingHours?: { start: string; end: string };
  therapistId?: string;
  reason?: string;
}

export async function fetchAvailability(date: string, kind?: string): Promise<AvailabilityResult> {
  // O tipo filtra a janela: quem vai fazer primeira consulta não deve ver
  // horário de tratamento, e vice-versa.
  return apiFetch<AvailabilityResult>(
    `/api/availability?date=${date}${kind ? `&kind=${kind}` : ""}`
  );
}

/**
 * O que acontece se este paciente marcar agora.
 *
 * Decidido no servidor: só ele sabe se há sessão no pacote, se a triagem foi
 * feita e quanto custa. A tela é o reflexo — nunca a decisão.
 */
export interface BookingOption {
  kind: "FIRST_CONSULTATION" | "PACKAGE_SESSION" | "EXTRA_SESSION" | null;
  blockedReason?: "screening_required" | "no_clinic" | "price_not_set";
  price: number;
  currency: string;
  requiresPayment: boolean;
  sessionsRemaining: number | null;
  sessionsIncluded: number | null;
}

export async function fetchBookingOptions(): Promise<BookingOption> {
  return apiFetch<BookingOption>("/api/patient/booking-options");
}

/** Abre o pagamento da consulta e devolve a URL do Checkout. */
export async function startAppointmentCheckout(appointmentId: string): Promise<string | null> {
  const r = await apiFetch<{ url: string | null }>(
    `/api/patient/appointments/${appointmentId}/checkout`,
    { method: "POST" }
  );
  return r.url ?? null;
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
