import { apiFetch } from "./client";

/**
 * O laboratório como o paciente o vê (081, T-3).
 *
 * Espelha `lib/lab-patient.ts` do servidor: nada aqui tem custo nem margem, e o
 * resultado só chega depois que a clínica libera — antes disso `result` é
 * `null`, sem "em breve" que sugira que já existe.
 */

export interface LabProduct {
  id: string;
  code: string;
  name: string;
  category: string | null;
  biomarkers: string[];
  /** `capillary`, ou `capillary+swab` nos de saúde sexual. */
  sampleType: string;
  turnaroundDays: number | null;
  price: number;
  currency: string;
  description: { en: string; pt: string };
  notUnder16: boolean;
}

export type LabOrderStatus =
  | "BASKET" | "CONFIRMED" | "KIT_DISPATCHED" | "SAMPLE_RECEIVED" | "PROCESSING_LAB" | "RESULTS_READY" | "CANCELLED_LAB";

/** As oito posições da tela — ver `lib/lab-stage.ts` no servidor. */
export type LabStage =
  | "basket" | "kit_preparing" | "register_kit" | "collect_and_post" | "at_lab" | "in_review" | "released" | "cancelled";

export interface LabOrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface LabOrderEvent {
  id: string;
  status: string;
  createdAt: string;
}

export interface LabOrder {
  id: string;
  orderNumber: string;
  status: LabOrderStatus;
  stage: LabStage;
  total: number;
  currency: string;
  createdAt: string;
  paidAt: string | null;
  items: LabOrderItem[];
  shipping: { name: string | null; address: string | null; postcode: string | null };
  registration: { status: string; registered: boolean; canRegister: boolean } | null;
  released: boolean;
  releasedAt: string | null;
  /** Quem lê primeiro. `DIRECT`: ninguém — o resultado é de quem comprou. */
  reviewMode: "THERAPIST" | "DIRECT";
  events: LabOrderEvent[];
}

export interface LabResultValue {
  id: string;
  biomarker: string;
  value: number | null;
  valueText: string | null;
  unit: string | null;
  minRange: number | null;
  maxRange: number | null;
  outOfRange: boolean;
  measuredAt: string | null;
}

export interface LabResult {
  reviewMode: "THERAPIST" | "DIRECT";
  releasedAt: string | null;
  noteEn: string;
  notePt: string;
  values: LabResultValue[];
  pdfAvailable: boolean;
  /** A frase de não-diagnóstico certa para este pedido — o servidor decide. */
  nonDiagnostic: { en: string; pt: string };
}

export interface LabCatalog {
  products: LabProduct[];
  orderingEnabled: boolean;
  reviewDays: number;
}

export async function fetchLabCatalog(): Promise<LabCatalog> {
  const res = await apiFetch<LabCatalog>("/api/mobile/labs/catalog");
  return { products: res.products ?? [], orderingEnabled: !!res.orderingEnabled, reviewDays: res.reviewDays ?? 2 };
}

export async function fetchLabProduct(id: string): Promise<{ product: LabProduct; orderingEnabled: boolean }> {
  const res = await apiFetch<{ product: LabProduct; orderingEnabled: boolean }>(`/api/mobile/labs/catalog/${id}`);
  return { product: res.product, orderingEnabled: !!res.orderingEnabled };
}

export async function fetchLabOrders(): Promise<{ orders: LabOrder[]; reviewDays: number; orderingEnabled: boolean }> {
  const res = await apiFetch<{ orders: LabOrder[]; reviewDays: number; orderingEnabled: boolean }>("/api/mobile/labs/orders");
  return { orders: res.orders ?? [], reviewDays: res.reviewDays ?? 2, orderingEnabled: !!res.orderingEnabled };
}

export async function fetchLabOrder(id: string): Promise<{ order: LabOrder; result: LabResult | null; reviewDays: number }> {
  return apiFetch<{ order: LabOrder; result: LabResult | null; reviewDays: number }>(`/api/mobile/labs/orders/${id}`);
}

export interface CreateLabOrderInput {
  items: { productId: string; quantity: number }[];
  shippingName?: string;
  shippingAddress: string;
  shippingPostcode: string;
}

/** Começa um pedido. O preço é do servidor; o corpo leva só produto e endereço. */
export async function createLabOrder(input: CreateLabOrderInput): Promise<LabOrder> {
  const res = await apiFetch<{ order: LabOrder }>("/api/mobile/labs/orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.order;
}

// ---------------------------------------------------------------------------
// Consentimento (T-4): o que um exame pelo app implica, aceito uma vez.
// ---------------------------------------------------------------------------

export interface LabConsent {
  accepted: boolean;
  acceptedAt: string | null;
  version: string;
  text: { title: string; points: string[]; accept: string };
}

export async function fetchLabConsent(locale: "en-GB" | "pt-BR"): Promise<LabConsent> {
  return apiFetch<LabConsent>(`/api/patient/lab-consent?locale=${locale}`);
}

export async function acceptLabConsent(): Promise<{ accepted: boolean; acceptedAt: string; version: string }> {
  return apiFetch("/api/patient/lab-consent", { method: "POST" });
}
