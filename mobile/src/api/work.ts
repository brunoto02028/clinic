import { apiFetch } from "./client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BusinessProfile {
  id: string;
  tradingName: string;
  legalName: string;
  vatNumber?: string;
  companyNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
}

export interface QuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  status: "draft" | "sent" | "accepted" | "declined" | "expired";
  clientName: string;
  clientEmail: string;
  clientAddress?: string;
  items: QuoteItem[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  validUntil?: string;
  createdAt: string;
  sentAt?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: "draft" | "sent" | "paid" | "overdue" | "void";
  quoteId?: string;
  clientName: string;
  clientEmail: string;
  clientAddress?: string;
  items: QuoteItem[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  dueDate?: string;
  paidAt?: string;
  createdAt: string;
}

export interface FollowUp {
  id: string;
  type: "quote_chase" | "payment_reminder" | "review_request";
  targetId: string;
  targetType: string;
  scheduledAt: string;
  completedAt?: string;
  note?: string;
  status: "pending" | "done" | "skipped";
}

export interface ComplianceItem {
  id: string;
  name: string;
  category: string;
  status: "valid" | "expiring" | "expired" | "missing";
  expiresAt?: string;
  documentUrl?: string;
}

export interface ComplianceOverview {
  items: ComplianceItem[];
  score: number;
}

// ---------------------------------------------------------------------------
// Business Profile
// ---------------------------------------------------------------------------

export async function fetchBusinessProfile(): Promise<BusinessProfile> {
  const res = await apiFetch<{ profile: BusinessProfile }>(
    "/api/mobile/work/business-profile",
  );
  return res.profile;
}

export async function updateBusinessProfile(
  data: Partial<BusinessProfile>,
): Promise<BusinessProfile> {
  const res = await apiFetch<{ profile: BusinessProfile }>(
    "/api/mobile/work/business-profile",
    { method: "PUT", body: JSON.stringify(data) },
  );
  return res.profile;
}

// ---------------------------------------------------------------------------
// Quotes
// ---------------------------------------------------------------------------

export async function fetchQuotes(): Promise<Quote[]> {
  const res = await apiFetch<{ quotes: Quote[] }>(
    "/api/mobile/work/quotes",
  );
  return res.quotes ?? [];
}

export async function createQuote(data: {
  clientName: string;
  clientEmail: string;
  clientAddress?: string;
  items: QuoteItem[];
  vatRate?: number;
}): Promise<Quote> {
  const res = await apiFetch<{ quote: Quote }>(
    "/api/mobile/work/quotes",
    { method: "POST", body: JSON.stringify(data) },
  );
  return res.quote;
}

export async function fetchQuote(id: string): Promise<Quote> {
  const res = await apiFetch<{ quote: Quote }>(
    `/api/mobile/work/quotes/${id}`,
  );
  return res.quote;
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export async function fetchInvoices(): Promise<Invoice[]> {
  const res = await apiFetch<{ invoices: Invoice[] }>(
    "/api/mobile/work/invoices",
  );
  return res.invoices ?? [];
}

export async function createInvoice(data: {
  clientName: string;
  clientEmail: string;
  clientAddress?: string;
  items: QuoteItem[];
  vatRate?: number;
  dueDate?: string;
  quoteId?: string;
}): Promise<Invoice> {
  const res = await apiFetch<{ invoice: Invoice }>(
    "/api/mobile/work/invoices",
    { method: "POST", body: JSON.stringify(data) },
  );
  return res.invoice;
}

export async function fetchInvoice(id: string): Promise<Invoice> {
  const res = await apiFetch<{ invoice: Invoice }>(
    `/api/mobile/work/invoices/${id}`,
  );
  return res.invoice;
}

// ---------------------------------------------------------------------------
// Follow-ups
// ---------------------------------------------------------------------------

export async function fetchFollowUps(): Promise<FollowUp[]> {
  const res = await apiFetch<{ followUps: FollowUp[] }>(
    "/api/mobile/work/follow-ups",
  );
  return res.followUps ?? [];
}

export async function createFollowUp(data: {
  type: FollowUp["type"];
  targetId: string;
  targetType: string;
  scheduledAt: string;
  note?: string;
}): Promise<FollowUp> {
  const res = await apiFetch<{ followUp: FollowUp }>(
    "/api/mobile/work/follow-ups",
    { method: "POST", body: JSON.stringify(data) },
  );
  return res.followUp;
}

export async function updateFollowUp(
  id: string,
  data: Partial<FollowUp>,
): Promise<FollowUp> {
  const res = await apiFetch<{ followUp: FollowUp }>(
    `/api/mobile/work/follow-ups/${id}`,
    { method: "PATCH", body: JSON.stringify(data) },
  );
  return res.followUp;
}

// ---------------------------------------------------------------------------
// Compliance
// ---------------------------------------------------------------------------

export async function fetchCompliance(): Promise<ComplianceOverview> {
  return apiFetch<ComplianceOverview>("/api/mobile/work/compliance");
}
