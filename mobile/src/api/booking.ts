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
export async function startAppointmentCheckout(
  appointmentId: string,
  /**
   * O cupom que a tela mostrou (084). Vai como **código**, nunca como valor:
   * o servidor recalcula o desconto antes de cobrar, e a prévia da T-3 não
   * autoriza nada.
   */
  couponCode?: string | null
): Promise<string | null> {
  const r = await apiFetch<{ url: string | null }>(
    `/api/patient/appointments/${appointmentId}/checkout`,
    // O header diz ao servidor que o retorno do Stripe deve voltar para o
    // app, e não para uma página do site (083).
    {
      method: "POST",
      headers: { "x-platform": "mobile" },
      body: JSON.stringify(couponCode ? { couponCode } : {}),
    }
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

/**
 * Os tratamentos que **esta** clínica oferece (082).
 *
 * A tela trazia sete nomes escritos no código ("Initial Assessment",
 * "Sports Therapy"…) que nenhuma clínica podia mudar — e o servidor descartava
 * a escolha do paciente de qualquer jeito. Agora a lista é a da clínica,
 * editável em /admin/treatment-types, e o que ele escolhe fica gravado.
 *
 * Lista vazia é resposta legítima: a clínica ainda não cadastrou nenhum. A
 * tela some em vez de inventar opções.
 */
export interface ClinicTreatmentType {
  id: string;
  name: string;
  namePt: string | null;
  duration: number;
  price: number;
}

export async function fetchTreatmentTypes(): Promise<ClinicTreatmentType[]> {
  const res = await apiFetch<ClinicTreatmentType[]>("/api/patient/treatment-types");
  return Array.isArray(res) ? res : [];
}
