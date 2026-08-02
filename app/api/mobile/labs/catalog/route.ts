export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";

export function OPTIONS() {
  return corsPreflight();
}

export async function GET() {
  const products = await prisma.labProduct.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return corsJson({ products });
}
