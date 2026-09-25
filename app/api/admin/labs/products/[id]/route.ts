export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { labStaff, canSetPrices, auditLab } from "@/lib/lab-admin";
import { labMargin } from "@/lib/lab-catalog";

/**
 * Preço de venda e interruptor de ativo (081, T-2).
 *
 * Vender abaixo do custo não é proibido — é o Bruno quem decide — mas não
 * acontece por engano: precisa de `confirmBelowCost: true`, e fica na
 * auditoria com o custo do momento.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await labStaff(request);
  if ("response" in guard) return guard.response;
  if (!canSetPrices(guard.actor)) {
    return NextResponse.json({ error: "Only the clinic owner sets prices", errorPt: "Só o dono da clínica define preços" }, { status: 403 });
  }

  const { id } = await params;
  const product = await prisma.labProduct.findUnique({ where: { id } });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const data: { retailPrice?: number; isActive?: boolean } = {};

  if (body.retailPrice !== undefined) {
    const n = Number(body.retailPrice);
    if (!Number.isFinite(n) || n <= 0) {
      return NextResponse.json({ error: "Price must be a positive number", errorPt: "O preço precisa ser um número positivo" }, { status: 400 });
    }
    data.retailPrice = Math.round(n * 100) / 100;
  }
  if (body.isActive !== undefined) data.isActive = !!body.isActive;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to change", errorPt: "Nada para mudar" }, { status: 400 });
  }

  const retailAfter = data.retailPrice ?? product.retailPrice;
  const activeAfter = data.isActive ?? product.isActive;
  const cost = product.costPrice ?? 0;
  const belowCost = retailAfter <= cost;

  // Um produto que vai ficar (ou continuar) à venda por menos do que custa.
  if (belowCost && activeAfter && body.confirmBelowCost !== true) {
    return NextResponse.json(
      {
        error: "The sale price is at or below cost. Confirm to keep it.",
        errorPt: "O preço de venda está igual ou abaixo do custo. Confirme para manter.",
        code: "below_cost",
        costPrice: cost,
        retailPrice: retailAfter,
      },
      { status: 409 }
    );
  }

  const updated = await prisma.labProduct.update({ where: { id }, data });

  const mudou: string[] = [];
  if (data.retailPrice !== undefined && data.retailPrice !== product.retailPrice) mudou.push(`price ${product.retailPrice} → ${data.retailPrice}`);
  if (data.isActive !== undefined && data.isActive !== product.isActive) mudou.push(data.isActive ? "activated" : "deactivated");
  if (mudou.length > 0) {
    await auditLab(
      guard.actor.userId,
      "LAB_PRODUCT_CHANGED",
      "LabProduct",
      id,
      `${product.lmlProductId} ${product.name}: ${mudou.join(", ")}${belowCost && activeAfter ? " (confirmed below cost)" : ""}`,
      { before: { retailPrice: product.retailPrice, isActive: product.isActive }, after: { retailPrice: updated.retailPrice, isActive: updated.isActive }, costPrice: cost, belowCost }
    );
  }

  return NextResponse.json({
    id: updated.id,
    retailPrice: updated.retailPrice,
    isActive: updated.isActive,
    margin: labMargin(updated.retailPrice, cost),
  });
}
