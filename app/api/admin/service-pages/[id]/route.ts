import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

// GET single service page by id
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SUPERADMIN", "ADMIN"].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const page = await (prisma as any).servicePage.findUnique({ where: { id: params.id } });
    if (!page) {
      return NextResponse.json({ error: "Service page not found" }, { status: 404 });
    }
    return NextResponse.json(page);
  } catch (error) {
    console.error("Error fetching service page:", error);
    return NextResponse.json({ error: "Failed to fetch service page" }, { status: 500 });
  }
}

// PUT update service page
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SUPERADMIN", "ADMIN"].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Check slug uniqueness if changed
    if (body.slug) {
      const existing = await (prisma as any).servicePage.findFirst({
        where: { slug: body.slug, id: { not: params.id } },
      });
      if (existing) {
        return NextResponse.json({ error: "A service page with this URL slug already exists" }, { status: 409 });
      }
    }

    const page = await (prisma as any).servicePage.update({
      where: { id: params.id },
      data: {
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.icon !== undefined && { icon: body.icon }),
        ...(body.color !== undefined && { color: body.color }),
        ...(body.titleEn !== undefined && { titleEn: body.titleEn }),
        ...(body.titlePt !== undefined && { titlePt: body.titlePt }),
        ...(body.descriptionEn !== undefined && { descriptionEn: body.descriptionEn || null }),
        ...(body.descriptionPt !== undefined && { descriptionPt: body.descriptionPt || null }),
        ...(body.heroImageUrl !== undefined && { heroImageUrl: body.heroImageUrl || null }),
        ...(body.heroImagePath !== undefined && { heroImagePath: body.heroImagePath || null }),
        ...(body.benefitsEn !== undefined && { benefitsEn: body.benefitsEn || null }),
        ...(body.benefitsPt !== undefined && { benefitsPt: body.benefitsPt || null }),
        ...(body.whoIsItForEn !== undefined && { whoIsItForEn: body.whoIsItForEn || null }),
        ...(body.whoIsItForPt !== undefined && { whoIsItForPt: body.whoIsItForPt || null }),
        ...(body.howItWorksEn !== undefined && { howItWorksEn: body.howItWorksEn || null }),
        ...(body.howItWorksPt !== undefined && { howItWorksPt: body.howItWorksPt || null }),
        ...(body.sessionInfoEn !== undefined && { sessionInfoEn: body.sessionInfoEn || null }),
        ...(body.sessionInfoPt !== undefined && { sessionInfoPt: body.sessionInfoPt || null }),
        ...(body.extraContentEn !== undefined && { extraContentEn: body.extraContentEn || null }),
        ...(body.extraContentPt !== undefined && { extraContentPt: body.extraContentPt || null }),
        ...(body.galleryJson !== undefined && { galleryJson: body.galleryJson || null }),
        ...(body.faqJson !== undefined && { faqJson: body.faqJson || null }),
        ...(body.published !== undefined && { published: body.published }),
        ...(body.showInMenu !== undefined && { showInMenu: body.showInMenu }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      },
    });

    return NextResponse.json(page);
  } catch (error) {
    console.error("Error updating service page:", error);
    return NextResponse.json({ error: "Failed to update service page" }, { status: 500 });
  }
}

// DELETE service page
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SUPERADMIN", "ADMIN"].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await (prisma as any).servicePage.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting service page:", error);
    return NextResponse.json({ error: "Failed to delete service page" }, { status: 500 });
  }
}
