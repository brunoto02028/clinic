import { apiFetch } from "./client";

/**
 * Pedidos de cancelamento do paciente (103 T-4).
 *
 * A rota atende o aplicativo porque `/api/patient` está em
 * `MOBILE_API_PREFIXES` no middleware e `getEffectiveUser` entende o bearer —
 * conferido antes de escrever isto, e não por otimismo: já houve três casos
 * nesta casa de tela do app morrendo no portão de sessão da web.
 */

export interface CancellationRequest {
  id: string;
  status: string;
  reason: string | null;
  createdAt: string;
  appointmentId?: string | null;
  appointment?: { id: string; dateTime: string; treatmentType: string | null } | null;
}

export async function fetchCancellationRequests(): Promise<CancellationRequest[]> {
  const res = await apiFetch<{ requests: CancellationRequest[] }>("/api/patient/cancellation");
  return res.requests ?? [];
}

export interface RespostaDoPedido {
  success: boolean;
  requestId: string;
  /** O servidor calcula; o app não repete a conta do reembolso. */
  refundEligible: boolean;
  refundAmount: number;
  isWithin48h: boolean;
  policyMessage: string;
}

export async function requestAppointmentCancellation(input: {
  appointmentId: string;
  reason: string;
  locale?: string;
}): Promise<RespostaDoPedido> {
  return apiFetch<RespostaDoPedido>("/api/patient/cancellation", {
    method: "POST",
    body: JSON.stringify({
      appointmentId: input.appointmentId,
      reason: input.reason,
      locale: input.locale,
    }),
  });
}
