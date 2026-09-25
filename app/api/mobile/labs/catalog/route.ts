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

/**
 * O catálogo como o paciente o vê (081, T-3): nome, o que mede, prazo e o
 * preço de venda. **Nunca o custo** — devolvia o `LabProduct` inteiro, com
 * `costPrice`, para qualquer um sem sequer estar logado.
 */
export async function GET(request: NextRequest) {
  const payload = getMobileUser(request);
  if (!payload) return corsJson({ error: "Unauthorised" }, { status: 401 });

  const [products, clinic] = await Promise.all([
    prisma.labProduct.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    payload.clinicId
      ? prisma.clinic.findUnique({ where: { id: payload.clinicId }, select: { labReviewDays: true } })
      : Promise.resolve(null),
  ]);

  return corsJson({
    products: products.map(patientProduct),
    orderingEnabled: labOrderingEnabled(),
    reviewDays: clinic?.labReviewDays ?? 2,
  });
}
