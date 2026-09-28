export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { labStaff, canSetPrices } from "@/lib/lab-admin";
import { labMargin } from "@/lib/lab-catalog";

/**
 * O catálogo como a clínica o vê: custo, preço de venda e a margem entre os
 * dois (081, T-2). O paciente nunca passa por aqui — a rota dele
 * (`/api/mobile/labs/catalog`) não devolve custo.
 */
export async function GET(request: NextRequest) {
  const guard = await labStaff(request);
  if ("response" in guard) return guard.response;

  const products = await prisma.labProduct.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });

  return NextResponse.json({
    canSetPrices: canSetPrices(guard.actor),
    products: products.map((p) => ({
      id: p.id,
      code: p.lmlProductId,
      name: p.name,
      category: p.category,
      biomarkers: p.biomarkers,
      sampleType: p.sampleType,
      turnaroundDays: p.turnaroundDays,
      costPrice: p.costPrice,
      retailPrice: p.retailPrice,
      margin: labMargin(p.retailPrice, p.costPrice ?? 0),
      isActive: p.isActive,
      lastSyncedAt: p.lastSyncedAt,
    })),
  });
}
