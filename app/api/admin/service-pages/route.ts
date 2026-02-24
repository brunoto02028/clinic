import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// GET all service pages (admin - includes unpublished)
// Also auto-seeds from SiteSettings.servicesJson if no pages exist yet
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SUPERADMIN", "ADMIN"].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let pages = await (prisma as any).servicePage.findMany({
      orderBy: { sortOrder: "asc" },
    });

    // Always sync: create ServicePage for any service in SiteSettings that doesn't have one yet
    try {
      const settings = await prisma.siteSettings.findFirst({ select: { servicesJson: true } });
      if (settings?.servicesJson) {
        const services: { id: string; title: string; description?: string; icon?: string }[] = JSON.parse(settings.servicesJson);
        const existingSlugs = new Set(pages.map((p: any) => p.slug));
        const existingTitles = new Set(pages.map((p: any) => p.titleEn?.toLowerCase()));

        const maxOrder = pages.length > 0
          ? Math.max(...pages.map((p: any) => p.sortOrder ?? 0))
          : -1;
        let nextOrder = maxOrder + 1;
        let created = false;

        for (const svc of services) {
          const slug = svc.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");

          if (existingSlugs.has(slug) || existingTitles.has(svc.title.toLowerCase())) continue;

          await (prisma as any).servicePage.create({
            data: {
              slug,
              icon: svc.icon || "Zap",
              color: "bg-primary/10 text-primary",
              titleEn: svc.title,
              titlePt: svc.title,
              descriptionEn: svc.description || null,
              descriptionPt: svc.description || null,
              published: true,
              showInMenu: true,
              sortOrder: nextOrder++,
            },
          });
          created = true;
        }

        if (created) {
          pages = await (prisma as any).servicePage.findMany({ orderBy: { sortOrder: "asc" } });
        }
      }
    } catch (seedErr) {
      console.warn("Service pages sync warning:", seedErr);
    }

    return NextResponse.json(pages);
  } catch (error) {
    console.error("Error fetching service pages:", error);
    return NextResponse.json({ error: "Failed to fetch service pages" }, { status: 500 });
  }
}

// POST create a new service page
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SUPERADMIN", "ADMIN"].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const slug = body.slug || slugify(body.titleEn || "new-service");

    // Check for duplicate slug
    const existing = await (prisma as any).servicePage.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: "A service page with this URL slug already exists" }, { status: 409 });
    }

    // Get max sortOrder
    const maxOrder = await (prisma as any).servicePage.aggregate({ _max: { sortOrder: true } });
    const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const page = await (prisma as any).servicePage.create({
      data: {
        slug,
        icon: body.icon || "Zap",
        color: body.color || "bg-primary/10 text-primary",
        titleEn: body.titleEn || "New Service",
        titlePt: body.titlePt || "Novo Serviço",
        descriptionEn: body.descriptionEn || null,
        descriptionPt: body.descriptionPt || null,
        heroImageUrl: body.heroImageUrl || null,
        heroImagePath: body.heroImagePath || null,
        benefitsEn: body.benefitsEn || null,
        benefitsPt: body.benefitsPt || null,
        whoIsItForEn: body.whoIsItForEn || null,
        whoIsItForPt: body.whoIsItForPt || null,
        howItWorksEn: body.howItWorksEn || null,
        howItWorksPt: body.howItWorksPt || null,
        sessionInfoEn: body.sessionInfoEn || null,
        sessionInfoPt: body.sessionInfoPt || null,
        extraContentEn: body.extraContentEn || null,
        extraContentPt: body.extraContentPt || null,
        galleryJson: body.galleryJson || null,
        faqJson: body.faqJson || null,
        published: body.published ?? true,
        showInMenu: body.showInMenu ?? true,
        sortOrder: body.sortOrder ?? nextOrder,
      },
    });

    return NextResponse.json(page, { status: 201 });
  } catch (error) {
    console.error("Error creating service page:", error);
    return NextResponse.json({ error: "Failed to create service page" }, { status: 500 });
  }
}
