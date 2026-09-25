export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { labStaff } from "@/lib/lab-admin";

/**
 * Os pedidos da clínica com a margem **congelada** de cada venda (081, T-2).
 *
 * A margem sai de `unitPrice - unitCost` do item, gravados no instante da
 * compra — não do preço de hoje. Um pedido de três meses atrás continua
 * dizendo quanto rendeu naquele dia.
 *
 * Carrinhos (`BASKET`) ficam de fora: são intenção, não venda.
 */
export async function GET(request: NextRequest) {
  const guard = await labStaff(request);
  if ("response" in guard) return guard.response;
  const { clinicId } = guard.actor;

  // O Prisma valida enum na consulta: um `?status=qualquer` derrubaria a rota
  // com 500 (a F1 da 080). Valor desconhecido é ignorado, não passado adiante.
  const STATUSES = ["CONFIRMED", "KIT_DISPATCHED", "SAMPLE_RECEIVED", "PROCESSING_LAB", "RESULTS_READY", "CANCELLED_LAB"] as const;
  const raw = request.nextUrl.searchParams.get("status");
  const status = STATUSES.find((s) => s === raw);
  const where: any = { clinicId, status: status ? status : { not: "BASKET" } };

  const orders = await prisma.labOrder.findMany({
    where,
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
      items: { select: { productName: true, quantity: true, unitPrice: true, unitCost: true, total: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const rows = orders.map((o) => {
    const cost = o.items.reduce((s, i) => s + i.unitCost * i.quantity, 0);
    const sold = o.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      patient: o.patient,
      products: o.items.map((i) => i.productName),
      total: o.total,
      cost: Math.round(cost * 100) / 100,
      margin: Math.round((sold - cost) * 100) / 100,
      paidAt: o.paidAt,
      releasedToPatientAt: o.releasedToPatientAt,
      awaitingRelease: o.status === "RESULTS_READY" && !o.releasedToPatientAt,
      createdAt: o.createdAt,
    };
  });

  // Totais só do que foi pago e não cancelado: é o que entrou de fato.
  const contam = rows.filter((r) => r.paidAt && r.status !== "CANCELLED_LAB");
  const totals = {
    orders: contam.length,
    sold: Math.round(contam.reduce((s, r) => s + r.total, 0) * 100) / 100,
    cost: Math.round(contam.reduce((s, r) => s + r.cost, 0) * 100) / 100,
    margin: Math.round(contam.reduce((s, r) => s + r.margin, 0) * 100) / 100,
    awaitingRelease: rows.filter((r) => r.awaitingRelease).length,
  };

  return NextResponse.json({ orders: rows, totals });
}
