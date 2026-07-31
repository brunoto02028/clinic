export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// GET — list all condition pages (SEO bridge pages, P4)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ADMIN", "SUPERADMIN", "THERAPIST"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const conditionPages = await (prisma as any).conditionPage.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ conditionPages });
}

// POST — create a condition page
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ADMIN", "SUPERADMIN", "THERAPIST"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const body = await req.json();
  const { nameEn, namePt, summaryEn, summaryPt, contentEn, contentPt, metaDescriptionEn, metaDescriptionPt, relatedArticleSlug, relatedServiceSlug, localIntent, published } = body;

  if (!nameEn?.trim() || !namePt?.trim()) {
    return NextResponse.json({ error: "nameEn and namePt are required" }, { status: 400 });
  }

  let slug = slugify(body.slug || nameEn);
  const existing = await (prisma as any).conditionPage.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const clinicId = (session.user as any).clinicId || null;

  const conditionPage = await (prisma as any).conditionPage.create({
    data: {
      clinicId,
      slug,
      nameEn,
      namePt,
      summaryEn: summaryEn || "",
      summaryPt: summaryPt || "",
      contentEn: contentEn || "",
      contentPt: contentPt || "",
      metaDescriptionEn: metaDescriptionEn || null,
      metaDescriptionPt: metaDescriptionPt || null,
      relatedArticleSlug: relatedArticleSlug || null,
      relatedServiceSlug: relatedServiceSlug || null,
      localIntent: localIntent || "Ipswich",
      published: published !== false,
    },
  });

  return NextResponse.json({ success: true, conditionPage });
}
