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
  /**
   * De quem é este exame (091 T-3). Nulo é o próprio titular.
   *
   * Numa conta que pede exame para mais de uma pessoa, resultado que aparece
   * sem dizer de quem é está pronto para ser lido errado.
   */
  subject: { id: string; firstName: string; lastName: string; dateOfBirth: string; idade: number } | null;
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
  /**
   * Todo exame à venda é kit em casa (091 T-1). Enquanto for verdade, a página
   * "como funciona" diz isso; quando entrar o primeiro exame com coleta em
   * farmácia, a frase some sozinha.
   */
  todosEmCasa: boolean;
}

export async function fetchLabCatalog(): Promise<LabCatalog> {
  const res = await apiFetch<LabCatalog>("/api/mobile/labs/catalog");
  return {
    products: res.products ?? [],
    orderingEnabled: !!res.orderingEnabled,
    reviewDays: res.reviewDays ?? 2,
    // Ausente (servidor antigo) não é "sim": na dúvida a frase não aparece.
    todosEmCasa: res.todosEmCasa === true,
  };
}

export async function fetchLabProduct(id: string): Promise<{ product: LabProduct; orderingEnabled: boolean }> {
  const res = await apiFetch<{ product: LabProduct; orderingEnabled: boolean }>(`/api/mobile/labs/catalog/${id}`);
  return { product: res.product, orderingEnabled: !!res.orderingEnabled };
}

export async function fetchLabOrders(): Promise<{ orders: LabOrder[]; reviewDays: number; orderingEnabled: boolean }> {
  const res = await apiFetch<{ orders: LabOrder[]; reviewDays: number; orderingEnabled: boolean }>("/api/mobile/labs/orders");
  return { orders: res.orders ?? [], reviewDays: res.reviewDays ?? 2, orderingEnabled: !!res.orderingEnabled };
}

export interface LabOrderDetalhe {
  order: LabOrder;
  result: LabResult | null;
  reviewDays: number;
  /**
   * Este pedido precisa de coleta num ponto (091 T-1). Hoje é `false` para
   * tudo — os 22 exames do catálogo são picada no dedo em casa — e o campo
   * existe para a tela oferecer o ponto sozinha quando entrar um venoso.
   */
  precisaDePontoDeColeta?: boolean;
}

export async function fetchLabOrder(id: string): Promise<LabOrderDetalhe> {
  return apiFetch<LabOrderDetalhe>(`/api/mobile/labs/orders/${id}`);
}

export interface CreateLabOrderInput {
  items: { productId: string; quantity: number }[];
  /** Para quem é o exame. Ausente ou nulo = para mim (091 T-3). */
  dependentId?: string | null;
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
  /** O primeiro nome de quem o aviso trata, quando não é o próprio titular. */
  forName?: string | null;
}

/**
 * O aviso, e se já foi aceito (091 T-4).
 *
 * `paraQuem` é o id da pessoa gerida. Com ele, o texto vem na voz de quem
 * responde por ela — cinco cláusulas mudam de dono, não só a da idade — e o
 * aceite consultado é **o dela**, porque é o exame dela que vai acontecer.
 */
export async function fetchLabConsent(
  locale: "en-GB" | "pt-BR",
  paraQuem?: string | null
): Promise<LabConsent> {
  const de = paraQuem ? `&for=${encodeURIComponent(paraQuem)}` : "";
  return apiFetch<LabConsent>(`/api/patient/lab-consent?locale=${locale}${de}`);
}

export async function acceptLabConsent(
  paraQuem?: string | null
): Promise<{ accepted: boolean; acceptedAt: string; version: string }> {
  const de = paraQuem ? `?for=${encodeURIComponent(paraQuem)}` : "";
  return apiFetch(`/api/patient/lab-consent${de}`, { method: "POST" });
}

// ---------------------------------------------------------------------------
// Pontos de coleta (081): onde a pessoa dá a amostra, perto de onde ela mora.
// ---------------------------------------------------------------------------

export interface PontoDeColeta {
  id: string;
  nome: string;
  endereco: string;
  cidade: string | null;
  postcode: string | null;
  distanciaKm: number | null;
  onibus: string | null;
  trem: string | null;
  proximaVaga: string | null;
}

/**
 * Quatro respostas, e três delas valem antes de o laboratório estar ligado.
 * Uma tela que não sabe **por que** está vazia só sabe ficar vazia: sem isto,
 * "complete seu cadastro" e "ainda não ligamos" viram o mesmo nada.
 */
export type EstadoDosPontos =
  | "sem_postcode"
  | "postcode_desconhecido"
  | "laboratorio_desconectado"
  | "ok";

export interface PontosDeColeta {
  estado: EstadoDosPontos;
  postcode: string | null;
  /** O distrito que o serviço de código postal devolve — confere na tela. */
  local: string | null;
  pontos: PontoDeColeta[];
}

/**
 * Os pontos perto de um código postal — o do cadastro, ou o que a pessoa
 * procurou (091 T-1). Sem argumento, responde pelo cadastro, como sempre.
 */
export async function fetchPontosDeColeta(postcode?: string | null): Promise<PontosDeColeta> {
  const busca = postcode?.trim() ? `?postcode=${encodeURIComponent(postcode.trim())}` : "";
  return apiFetch<PontosDeColeta>(`/api/mobile/labs/collection-points${busca}`);
}
