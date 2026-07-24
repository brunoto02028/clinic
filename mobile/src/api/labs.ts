import { apiFetch } from "./client";

// ---------------------------------------------------------------------------
// Types
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

export interface LabOrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
}

export interface LabOrderEvent {
  id: string;
  type:
    | "placed"
    | "confirmed"
    | "sample_received"
    | "processing"
    | "results_ready"
    | "completed";
  occurredAt: string;
  note?: string;
}

export interface LabOrder {
  id: string;
  orderNumber: string;
  status:
    | "pending"
    | "confirmed"
    | "processing"
    | "results_ready"
    | "completed"
    | "cancelled";
  items: LabOrderItem[];
  subtotal: number;
  total: number;
  createdAt: string;
  events: LabOrderEvent[];
  resultsUrl?: string;
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

export async function fetchLabOrders(): Promise<LabOrder[]> {
  const res = await apiFetch<{ orders: LabOrder[] }>(
    "/api/mobile/labs/orders",
  );
  return res.orders ?? [];
}

export async function createLabOrder(
  items: { productId: string; quantity: number }[],
): Promise<LabOrder> {
  const res = await apiFetch<{ order: LabOrder }>(
    "/api/mobile/labs/orders",
    { method: "POST", body: JSON.stringify({ items }) },
  );
  return res.order;
}

export async function fetchLabOrder(id: string): Promise<LabOrder> {
  const res = await apiFetch<{ order: LabOrder }>(
    `/api/mobile/labs/orders/${id}`,
  );
  return res.order;
}
