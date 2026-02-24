import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from '@/lib/get-effective-user';

export const dynamic = "force-dynamic";

/**
 * GET /api/patient/journey/marketplace — Get marketplace products with recommendations
 */
export async function GET() {
  try {
    const effectiveUser = await getEffectiveUser();
  if (!effectiveUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = effectiveUser.userId;
    const _u = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } }); const clinicId = _u?.clinicId || null;

    // Get patient progress for recommendation context
    const progress = await (prisma as any).patientProgress.findUnique({ where: { patientId: userId } });

    // All active products
    const products = await (prisma as any).marketplaceProduct.findMany({
      where: { isActive: true, ...(clinicId ? { clinicId } : {}) },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    // Categorize
    const categories: Record<string, any[]> = {
      recommended: [],
      digital_program: [],
      physical_product: [],
      equipment: [],
      supplement: [],
      special_session: [],
      subscription: [],
    };

    for (const product of products) {
      categories[product.category]?.push(product);

      // Check if recommended for this patient
      if (product.targetArchetypes && progress?.archetypeKey) {
        const archetypes = product.targetArchetypes as string[];
        if (archetypes.includes(progress.archetypeKey)) {
          categories.recommended.push(product);
          continue;
        }
      }
      if (product.targetMinLevel && progress?.level >= product.targetMinLevel) {
        if (!categories.recommended.includes(product)) {
          categories.recommended.push(product);
        }
      }
      if (product.targetConditions && progress) {
        const conditions = product.targetConditions as Record<string, string>;
        let match = true;
        for (const [key, condition] of Object.entries(conditions)) {
          const val = (progress as any)[key];
          if (condition.startsWith(">") && !(val > parseInt(condition.slice(1)))) match = false;
          if (condition.startsWith("<") && !(val < parseInt(condition.slice(1)))) match = false;
        }
        if (match && !categories.recommended.includes(product)) {
          categories.recommended.push(product);
        }
      }
    }

    return NextResponse.json({
      products,
      categories,
      credits: progress?.bprCredits || 0,
      level: progress?.level || 1,
      levelTitle: progress?.levelTitle || "Recovery Starter",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
