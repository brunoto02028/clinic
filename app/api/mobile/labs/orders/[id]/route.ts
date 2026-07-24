export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getMobileUser } from "@/lib/mobile-auth-guard";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";

export function OPTIONS() {
  return corsPreflight();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getMobileUser(request);
  if (!payload) {
    return corsJson({ error: "Unauthorised" }, { status: 401 });
  }

  const { id } = await params;

  const order = await prisma.labOrder.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      events: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!order || order.patientId !== payload.sub) {
    return corsJson({ error: "Order not found" }, { status: 404 });
  }

  return corsJson({ order });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getMobileUser(request);
  if (!payload) {
    return corsJson({ error: "Unauthorised" }, { status: 401 });
  }

  const { id } = await params;

  const order = await prisma.labOrder.findUnique({ where: { id } });

  if (!order || order.patientId !== payload.sub) {
    return corsJson({ error: "Order not found" }, { status: 404 });
  }

  if (order.status !== "BASKET") {
    return corsJson(
      { error: "Only BASKET orders can be confirmed" },
      { status: 400 }
    );
  }

  const updated = await prisma.labOrder.update({
    where: { id },
    data: {
      status: "CONFIRMED",
      events: {
        create: { status: "CONFIRMED", note: "Order confirmed by patient" },
      },
    },
    include: {
      items: { include: { product: true } },
      events: { orderBy: { createdAt: "desc" } },
    },
  });

  return corsJson({ order: updated });
}
