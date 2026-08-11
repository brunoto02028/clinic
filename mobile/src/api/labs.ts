import { apiFetch } from "./client";

// ---------------------------------------------------------------------------
// Types (mirror prisma/schema.prisma: LabProduct, LabOrder, LabOrderItem,
// LabOrderEvent, LabOrderStatus — kept in sync with the actual backend
// responses from app/api/mobile/labs/*)
// ---------------------------------------------------------------------------

export interface LabProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  biomarkers: string[];
  sampleType: string;
  turnaroundDays: number;
  price: number;
  currency: string;
}

export type LabOrderStatus =
  | "BASKET"
  | "CONFIRMED"
  | "KIT_DISPATCHED"
  | "SAMPLE_RECEIVED"
  | "PROCESSING_LAB"
  | "RESULTS_READY"
  | "CANCELLED_LAB";

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
  status: LabOrderStatus | string;
  note?: string | null;
  createdAt: string;
}

export interface LabOrder {
  id: string;
  orderNumber: string;
  status: LabOrderStatus;
  items: LabOrderItem[];
  subtotal: number;
  total: number;
  currency: string;
  shippingName?: string | null;
  shippingAddress?: string | null;
  shippingPostcode?: string | null;
  // Populated once LML returns a report link. No structured biomarker
  // endpoint exists yet (see LabTestRegistration/LabResult in the plan) —
  // the result screen renders from this URL until that lands.
  resultsUrl?: string | null;
  resultsPdf?: string | null;
  createdAt: string;
  events: LabOrderEvent[];
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export async function fetchLabCatalog(): Promise<LabProduct[]> {
  const res = await apiFetch<{ products: LabProduct[] }>(
    "/api/mobile/labs/catalog",
  );
  return res.products ?? [];
}

export async function fetchLabProduct(id: string): Promise<LabProduct> {
  const res = await apiFetch<{ product: LabProduct }>(
    `/api/mobile/labs/catalog/${id}`,
  );
  return res.product;
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export interface CreateLabOrderInput {
  items: { productId: string; quantity: number }[];
  // NOTE: the LabOrder model already has shippingName/shippingAddress/
  // shippingPostcode columns, but POST /api/mobile/labs/orders currently
  // only reads `items` from the body — these are sent for forward
  // compatibility and are silently ignored server-side until that route
  // is updated to persist them.
  shippingAddress?: string;
  shippingPostcode?: string;
}

export async function createLabOrder(
  input: CreateLabOrderInput,
): Promise<LabOrder> {
  const res = await apiFetch<{ order: LabOrder }>(
    "/api/mobile/labs/orders",
    { method: "POST", body: JSON.stringify(input) },
  );
  return res.order;
}

export async function fetchLabOrders(): Promise<LabOrder[]> {
  const res = await apiFetch<{ orders: LabOrder[] }>(
    "/api/mobile/labs/orders",
  );
  return res.orders ?? [];
}

export async function fetchLabOrder(id: string): Promise<LabOrder> {
  const res = await apiFetch<{ order: LabOrder }>(
    `/api/mobile/labs/orders/${id}`,
  );
  return res.order;
}
