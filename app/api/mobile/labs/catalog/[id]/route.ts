export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getMobileUser } from "@/lib/mobile-auth-guard";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";
import { patientProduct } from "@/lib/lab-patient";
import { labOrderingEnabled } from "@/lib/lab-ordering";

export function OPTIONS() {
  return corsPreflight();
}

/** Um exame, sem custo, e só se estiver à venda — um desligado não existe para o paciente. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = getMobileUser(request);
  if (!payload) return corsJson({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const product = await prisma.labProduct.findFirst({ where: { id, isActive: true } });
  if (!product) return corsJson({ error: "Product not found", errorPt: "Exame não encontrado" }, { status: 404 });

  return corsJson({ product: patientProduct(product), orderingEnabled: labOrderingEnabled() });
}
