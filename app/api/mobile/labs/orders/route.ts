export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getMobileUser } from "@/lib/mobile-auth-guard";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";
import { patientOrder, patientOrderInclude } from "@/lib/lab-patient";
import { labOrderingEnabled } from "@/lib/lab-ordering";
import { hasLabConsent } from "@/lib/lab-consent";

export function OPTIONS() {
  return corsPreflight();
}

/** Os pedidos do paciente, cada um com o estágio em que está (081, T-3). */
export async function GET(request: NextRequest) {
  const payload = getMobileUser(request);
  if (!payload) return corsJson({ error: "Unauthorised" }, { status: 401 });

  const [orders, clinic] = await Promise.all([
    prisma.labOrder.findMany({
      where: { patientId: payload.sub, status: { not: "BASKET" } },
      include: patientOrderInclude(),
      orderBy: { createdAt: "desc" },
    }),
    payload.clinicId
      ? prisma.clinic.findUnique({ where: { id: payload.clinicId }, select: { labReviewDays: true } })
      : Promise.resolve(null),
  ]);

  return corsJson({
    orders: orders.map(patientOrder),
    reviewDays: clinic?.labReviewDays ?? 2,
    orderingEnabled: labOrderingEnabled(),
  });
}

/**
 * Começa um pedido (081). O servidor decide o preço — o corpo traz produto e
 * quantidade, mais nada — e grava o custo do momento junto, para a margem
 * ficar congelada.
 *
 * Fechado enquanto a compra não estiver ligada de ponta a ponta (laboratório
 * + cobrança, T-5/T-6): um pedido que nasce e não tem como ser pago nem
 * despachado é uma promessa vazia.
 */
export async function POST(request: NextRequest) {
  const payload = getMobileUser(request);
  if (!payload) return corsJson({ error: "Unauthorised" }, { status: 401 });

  // O consentimento vem antes de tudo — inclusive de a loja estar aberta. É a
  // declaração do paciente sobre o que um exame implica (T-4), e a tela
  // pergunta antes para esta recusa nunca precisar acontecer.
  const consent = await hasLabConsent(payload.sub);
  if (!consent.accepted) {
    return corsJson(
      { error: "Please read and accept the laboratory test notice before ordering.", errorPt: "Leia e aceite o aviso sobre exames de laboratório antes de pedir.", code: "consent_required" },
      { status: 403 }
    );
  }

  if (!labOrderingEnabled()) {
    return corsJson(
      { error: "Ordering is not open yet.", errorPt: "A compra ainda não está aberta.", code: "ordering_unavailable" },
      { status: 503 }
    );
  }
  if (!payload.clinicId) {
    return corsJson({ error: "No clinic", errorPt: "Sem clínica", code: "no_clinic" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const items: { productId: string; quantity: number }[] = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return corsJson({ error: "items array is required", errorPt: "Escolha ao menos um exame" }, { status: 400 });
  }
  for (const i of items) {
    const q = Number(i.quantity);
    if (!Number.isInteger(q) || q < 1 || q > 5) {
      return corsJson({ error: "Quantity must be between 1 and 5", errorPt: "A quantidade precisa estar entre 1 e 5" }, { status: 400 });
    }
  }

  const shippingName = String(body.shippingName ?? `${payload.firstName} ${payload.lastName}`).trim().slice(0, 120);
  const shippingAddress = String(body.shippingAddress ?? "").trim().slice(0, 500);
  const shippingPostcode = String(body.shippingPostcode ?? "").trim().toUpperCase().slice(0, 12);
  if (!shippingAddress || !shippingPostcode) {
    return corsJson(
      { error: "The kit goes by post: address and postcode are required.", errorPt: "O kit vai pelo correio: endereço e CEP são obrigatórios.", code: "shipping_required" },
      { status: 400 }
    );
  }

  const productIds = items.map((i) => i.productId);
  const products = await prisma.labProduct.findMany({ where: { id: { in: productIds }, isActive: true } });
  if (products.length !== new Set(productIds).size) {
    return corsJson({ error: "One or more products not found or inactive", errorPt: "Um dos exames não está disponível" }, { status: 400 });
  }
  const productMap = new Map(products.map((p) => [p.id, p]));

  const year = new Date().getFullYear();
  const lastOrder = await prisma.labOrder.findFirst({
    where: { orderNumber: { startsWith: `LB-${year}-` } },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });
  let seq = 1;
  if (lastOrder) {
    const lastSeq = parseInt(lastOrder.orderNumber.split("-")[2], 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }
  const orderNumber = `LB-${year}-${String(seq).padStart(5, "0")}`;

  const lineItems = items.map((item) => {
    const product = productMap.get(item.productId)!;
    const quantity = Math.floor(Number(item.quantity));
    return {
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice: product.retailPrice,
      unitCost: product.costPrice ?? 0,
      total: Math.round(product.retailPrice * quantity * 100) / 100,
    };
  });
  const subtotal = Math.round(lineItems.reduce((sum, li) => sum + li.total, 0) * 100) / 100;

  const order = await prisma.labOrder.create({
    data: {
      orderNumber,
      patientId: payload.sub,
      clinicId: payload.clinicId,
      status: "BASKET",
      subtotal,
      total: subtotal,
      shippingName,
      shippingAddress,
      shippingPostcode,
      items: { create: lineItems },
      events: { create: { status: "BASKET", note: "Order created" } },
    },
    include: patientOrderInclude(),
  });

  return corsJson({ order: patientOrder(order) }, { status: 201 });
}
