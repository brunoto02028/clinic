import { apiFetch } from "./client";

export interface Appointment {
  id: string;
  dateTime: string;
  /**
   * Presencial ou por vídeo (089).
   *
   * Já vinha do servidor — a rota usa `include`, então todos os campos escalares
   * chegam — e o app simplesmente não o declarava. Sem isto a tela da consulta
   * não tinha como saber que havia uma chamada para entrar.
   */
  mode?: "IN_PERSON" | "VIDEO" | "HOME_VISIT";
  /**
   * O formato que esta pessoa pediu, e o que a clinica fez com o pedido (098).
   *
   * Sao tres estados na tela: pendente (pediu, ninguem decidiu), aprovado (o
   * `mode` ja mudou) e recusado (continua na clinica, com o motivo).
   */
  requestedMode?: "VIDEO" | "HOME_VISIT" | null;
  modeApprovedAt?: string | null;
  modeRefusedReason?: string | null;
  treatmentType: string;
  status: string;
  duration: number;
  price: number;
  /**
   * Como esta consulta se paga (101 T-3).
   *
   * Uma consulta marcada pela clinica nasce `PENDING` e so vira `CONFIRMED`
   * quando o dinheiro entra. A tela precisa saber se oferece o cartao ou se
   * diz "pague na clinica" — sao a mesma consulta pendente e duas frases
   * opostas.
   */
  paymentMethod?: "ONLINE" | "IN_PERSON";
  /** O pagamento, quando ja houve um. `status: "COMPLETED"` e o que quitou. */
  payment?: { id: string; status: string; amount: number } | null;
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
    // English: the caller decides what the patient reads, and the screens
    // pass this through `t()`. A Portuguese string thrown from the client
    // reached an en-GB patient verbatim.
    throw new Error("Appointment not found");
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
