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

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!quote || quote.createdById !== payload.sub) {
    return corsJson({ error: "Not found" }, { status: 404 });
  }

  return corsJson({ quote });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = getMobileUser(request);
  if (!payload) return corsJson({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.quote.findUnique({ where: { id } });
  if (!existing || existing.createdById !== payload.sub) {
    return corsJson({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { clientName, clientEmail, clientAddress, vatRate, validUntil, notes, status, items } = body;

  const updateData: Record<string, unknown> = {};
  if (clientName !== undefined) updateData.clientName = clientName;
  if (clientEmail !== undefined) updateData.clientEmail = clientEmail;
  if (clientAddress !== undefined) updateData.clientAddress = clientAddress;
  if (vatRate !== undefined) updateData.vatRate = vatRate;
  if (validUntil !== undefined) updateData.validUntil = validUntil ? new Date(validUntil) : null;
  if (notes !== undefined) updateData.notes = notes;
  if (status !== undefined) updateData.status = status;

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

    const quote = await prisma.$transaction(async (tx) => {
      await tx.quoteItem.deleteMany({ where: { quoteId: id } });
      return tx.quote.update({
        where: { id },
        data: { ...updateData, items: { create: parsedItems } },
        include: { items: true },
      });
    });

    return corsJson({ quote });
  }

  const quote = await prisma.quote.update({
    where: { id },
    data: updateData,
    include: { items: true },
  });

  return corsJson({ quote });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = getMobileUser(request);
  if (!payload) return corsJson({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;

  const quote = await prisma.quote.findUnique({ where: { id } });
  if (!quote || quote.createdById !== payload.sub) {
    return corsJson({ error: "Not found" }, { status: 404 });
  }

  if (quote.status !== "DRAFT") {
    return corsJson({ error: "Only DRAFT quotes can be deleted" }, { status: 400 });
  }

  await prisma.quote.delete({ where: { id } });

  return corsJson({ deleted: true });
}
