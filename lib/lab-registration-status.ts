import type { LabRegistrationStatus, LabOrderStatus } from "@prisma/client";

/**
 * A ponte entre o nome que a LML usa e o enum do schema (081, T-1).
 *
 * O nome deles é minúsculo (`awaiting_patient`); o nosso é o mesmo em
 * maiúsculo — de propósito, um para um, sem tradução criativa. O teste em
 * __tests__/labs/registration-status.test.ts lê o enum do `schema.prisma` e
 * reprova se este mapa e ele divergirem, porque a F1 da 080 nasceu exatamente
 * de assumir um valor de enum que o modelo não tinha, e 32 testes mockados
 * não viram.
 */
export const LML_STATUS: Record<string, LabRegistrationStatus> = {
  awaiting_patient: "AWAITING_PATIENT",
  pending: "PENDING",
  pending_authentication: "PENDING_AUTHENTICATION",
  success: "SUCCESS",
  partial_result: "PARTIAL_RESULT",
  fail: "FAIL",
  processing_error: "PROCESSING_ERROR",
};

/** O estado da LML como enum nosso; `null` para um nome que não conhecemos. */
export function registrationStatusFromLml(raw: string | null | undefined): LabRegistrationStatus | null {
  if (!raw) return null;
  return LML_STATUS[raw.trim().toLowerCase()] ?? null;
}

/**
 * A ordem do ciclo do pedido. Um webhook reenviado chega fora de ordem
 * (resultado antes do despacho), e o pedido não pode andar para trás: só
 * avança para um estado que vem depois do atual.
 */
const ORDER_FLOW: LabOrderStatus[] = [
  "BASKET",
  "CONFIRMED",
  "KIT_DISPATCHED",
  "SAMPLE_RECEIVED",
  "PROCESSING_LAB",
  "RESULTS_READY",
];

export function orderMayAdvance(from: LabOrderStatus, to: LabOrderStatus): boolean {
  if (to === "CANCELLED_LAB") return from !== "RESULTS_READY";
  const i = ORDER_FLOW.indexOf(from);
  const j = ORDER_FLOW.indexOf(to);
  return i >= 0 && j >= 0 && j > i;
}

/** O que o resultado significa para o pedido: pronto, ou parado com erro. */
export function registrationIsTerminal(status: LabRegistrationStatus): boolean {
  return status === "SUCCESS" || status === "PARTIAL_RESULT" || status === "FAIL" || status === "PROCESSING_ERROR";
}
