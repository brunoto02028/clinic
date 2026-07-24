export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth-guard";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";
import { prisma } from "@/lib/db";

export function OPTIONS() {
  return corsPreflight();
}

export async function GET(request: NextRequest) {
  const payload = getMobileUser(request);
  if (!payload) return corsJson({ error: "Unauthorised" }, { status: 401 });

  const profile = await prisma.businessProfile.findUnique({
    where: { userId: payload.sub },
    select: { id: true },
  });
  if (!profile) return corsJson({ invoices: [] });

  const invoices = await prisma.invoice.findMany({
    where: { businessId: profile.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return corsJson({ invoices });
}

async function generateInvoiceNumber(): Promise<string> {
  const lastInvoice = await prisma.invoice.findFirst({
    orderBy: { createdAt: "desc" },
    select: { invoiceNumber: true },
  });

  const year = new Date().getFullYear();
  let seq = 1;
  if (lastInvoice) {
    const parts = lastInvoice.invoiceNumber.split("-");
    const lastSeq = parseInt(parts[2] || "0", 10);
    seq = lastSeq + 1;
  }
  return `INV-${year}-${String(seq).padStart(5, "0")}`;
}

export async function POST(request: NextRequest) {
  const payload = getMobileUser(request);
  if (!payload) return corsJson({ error: "Unauthorised" }, { status: 401 });

  const body = await request.json();
  const { quoteId, clientName, clientEmail, clientAddress, vatRate = 20, dueDate, notes, items } = body;

  const profile = await prisma.businessProfile.upsert({
    where: { userId: payload.sub },
    update: {},
    create: { userId: payload.sub, tradingName: `${payload.firstName} ${payload.lastName}` },
  });

  // Convert from quote
  if (quoteId) {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: { items: true },
    });

    if (!quote || quote.createdById !== payload.sub) {
      return corsJson({ error: "Quote not found" }, { status: 404 });
    }
    if (quote.status === "INVOICED") {
      return corsJson({ error: "Quote already invoiced" }, { status: 400 });
    }

    const invoiceNumber = await generateInvoiceNumber();
    const paymentTerms = profile.paymentTermsDays ?? 14;
    const computedDueDate = dueDate ? new Date(dueDate) : new Date(Date.now() + paymentTerms * 86400000);

    const invoice = await prisma.$transaction(async (tx) => {
      await tx.quote.update({ where: { id: quoteId }, data: { status: "INVOICED" } });

      return tx.invoice.create({
        data: {
          invoiceNumber,
          businessId: profile.id,
          createdById: payload.sub,
          quoteId,
          clientName: quote.clientName,
          clientEmail: quote.clientEmail,
          clientAddress: quote.clientAddress,
          vatRate: quote.vatRate,
          subtotal: quote.subtotal,
          vatAmount: quote.vatAmount,
          total: quote.total,
          dueDate: computedDueDate,
          notes: notes ?? quote.notes,
          items: {
            create: quote.items.map((qi) => ({
              description: qi.description,
              quantity: qi.quantity,
              unitPrice: qi.unitPrice,
              total: qi.total,
            })),
          },
        },
        include: { items: true },
      });
    });

    return corsJson({ invoice }, { status: 201 });
  }

  // Create from scratch
  if (!clientName || !Array.isArray(items) || items.length === 0) {
    return corsJson({ error: "clientName and at least one item are required" }, { status: 400 });
  }

  const parsedItems = items.map((it: { description: string; quantity?: number; unitPrice: number }) => {
    const qty = it.quantity ?? 1;
    return { description: it.description, quantity: qty, unitPrice: it.unitPrice, total: qty * it.unitPrice };
  });

  const subtotal = parsedItems.reduce((sum: number, it: { total: number }) => sum + it.total, 0);
  const vatAmount = subtotal * (vatRate / 100);
  const total = subtotal + vatAmount;

  const invoiceNumber = await generateInvoiceNumber();
  const paymentTerms = profile.paymentTermsDays ?? 14;
  const computedDueDate = dueDate ? new Date(dueDate) : new Date(Date.now() + paymentTerms * 86400000);

  const invoice = await prisma.$transaction(async (tx) => {
    return tx.invoice.create({
      data: {
        invoiceNumber,
        businessId: profile.id,
        createdById: payload.sub,
        clientName,
        clientEmail: clientEmail || null,
        clientAddress: clientAddress || null,
        vatRate,
        subtotal,
        vatAmount,
        total,
        dueDate: computedDueDate,
        notes: notes || null,
        items: { create: parsedItems },
      },
      include: { items: true },
    });
  });

  return corsJson({ invoice }, { status: 201 });
}
