export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth-guard";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";
import { prisma } from "@/lib/db";

export function OPTIONS() {
  return corsPreflight();
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = getMobileUser(request);
  if (!payload) return corsJson({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!invoice || invoice.createdById !== payload.sub) {
    return corsJson({ error: "Not found" }, { status: 404 });
  }

  return corsJson({ invoice });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = getMobileUser(request);
  if (!payload) return corsJson({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing || existing.createdById !== payload.sub) {
    return corsJson({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { clientName, clientEmail, clientAddress, vatRate, dueDate, notes, items } = body;

  const updateData: Record<string, unknown> = {};
  if (clientName !== undefined) updateData.clientName = clientName;
  if (clientEmail !== undefined) updateData.clientEmail = clientEmail;
  if (clientAddress !== undefined) updateData.clientAddress = clientAddress;
  if (vatRate !== undefined) updateData.vatRate = vatRate;
  if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
  if (notes !== undefined) updateData.notes = notes;

  if (Array.isArray(items)) {
    const parsedItems = items.map((it: { description: string; quantity?: number; unitPrice: number }) => {
      const qty = it.quantity ?? 1;
      return { description: it.description, quantity: qty, unitPrice: it.unitPrice, total: qty * it.unitPrice };
    });

    const effectiveVatRate = vatRate ?? existing.vatRate;
    const subtotal = parsedItems.reduce((sum: number, it: { total: number }) => sum + it.total, 0);
    const vatAmount = subtotal * (effectiveVatRate / 100);
    const total = subtotal + vatAmount;

    updateData.subtotal = subtotal;
    updateData.vatAmount = vatAmount;
    updateData.total = total;

    const invoice = await prisma.$transaction(async (tx) => {
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
      return tx.invoice.update({
        where: { id },
        data: { ...updateData, items: { create: parsedItems } },
        include: { items: true },
      });
    });

    return corsJson({ invoice });
  }

  const invoice = await prisma.invoice.update({
    where: { id },
    data: updateData,
    include: { items: true },
  });

  return corsJson({ invoice });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = getMobileUser(request);
  if (!payload) return corsJson({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing || existing.createdById !== payload.sub) {
    return corsJson({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { status, paidAmount, paidAt } = body;

  const updateData: Record<string, unknown> = {};
  if (status !== undefined) updateData.status = status;
  if (paidAmount !== undefined) updateData.paidAmount = paidAmount;
  if (paidAt !== undefined) updateData.paidAt = paidAt ? new Date(paidAt) : null;

  if (status === "PAID_INV" && !paidAt) {
    updateData.paidAt = new Date();
    updateData.paidAmount = existing.total;
  }

  const invoice = await prisma.invoice.update({
    where: { id },
    data: updateData,
    include: { items: true },
  });

  return corsJson({ invoice });
}
