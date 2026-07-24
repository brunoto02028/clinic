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
  if (!profile) return corsJson({ quotes: [] });

  const quotes = await prisma.quote.findMany({
    where: { businessId: profile.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return corsJson({ quotes });
}

export async function POST(request: NextRequest) {
  const payload = getMobileUser(request);
  if (!payload) return corsJson({ error: "Unauthorised" }, { status: 401 });

  const body = await request.json();
  const { clientName, clientEmail, clientAddress, vatRate = 20, validUntil, notes, items } = body;

  if (!clientName || !Array.isArray(items) || items.length === 0) {
    return corsJson({ error: "clientName and at least one item are required" }, { status: 400 });
  }

  const profile = await prisma.businessProfile.upsert({
    where: { userId: payload.sub },
    update: {},
    create: { userId: payload.sub, tradingName: `${payload.firstName} ${payload.lastName}` },
  });

  const lastQuote = await prisma.quote.findFirst({
    orderBy: { createdAt: "desc" },
    select: { quoteNumber: true },
  });

  const year = new Date().getFullYear();
  let seq = 1;
  if (lastQuote) {
    const parts = lastQuote.quoteNumber.split("-");
    const lastSeq = parseInt(parts[2] || "0", 10);
    seq = lastSeq + 1;
  }
  const quoteNumber = `Q-${year}-${String(seq).padStart(5, "0")}`;

  const parsedItems = items.map((it: { description: string; quantity?: number; unitPrice: number }) => {
    const qty = it.quantity ?? 1;
    return { description: it.description, quantity: qty, unitPrice: it.unitPrice, total: qty * it.unitPrice };
  });

  const subtotal = parsedItems.reduce((sum: number, it: { total: number }) => sum + it.total, 0);
  const vatAmount = subtotal * (vatRate / 100);
  const total = subtotal + vatAmount;

  const quote = await prisma.$transaction(async (tx) => {
    return tx.quote.create({
      data: {
        quoteNumber,
        businessId: profile.id,
        createdById: payload.sub,
        clientName,
        clientEmail: clientEmail || null,
        clientAddress: clientAddress || null,
        vatRate,
        subtotal,
        vatAmount,
        total,
        validUntil: validUntil ? new Date(validUntil) : null,
        notes: notes || null,
        items: { create: parsedItems },
      },
      include: { items: true },
    });
  });

  return corsJson({ quote }, { status: 201 });
}
