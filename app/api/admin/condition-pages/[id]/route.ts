export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// PATCH — update a condition page
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ADMIN", "SUPERADMIN", "THERAPIST"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const body = await req.json();
  const data: any = {};
  for (const key of [
    "nameEn", "namePt", "summaryEn", "summaryPt", "contentEn", "contentPt",
    "metaDescriptionEn", "metaDescriptionPt", "relatedArticleSlug", "relatedServiceSlug",
    "localIntent", "published",
  ]) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if (body.slug) data.slug = slugify(body.slug);

  try {
    const conditionPage = await (prisma as any).conditionPage.update({ where: { id: params.id }, data });
    return NextResponse.json({ success: true, conditionPage });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// DELETE — remove a condition page
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ADMIN", "SUPERADMIN", "THERAPIST"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  try {
    await (prisma as any).conditionPage.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
