import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { isDbUnreachableError, MOCK_ARTICLES, devFallbackResponse } from "@/lib/dev-fallback";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const published = searchParams.get("published");
    const limit = searchParams.get("limit");

    // This route is unauthenticated (the homepage and /articles read it), so
    // anyone who isn't staff only ever gets published articles — a draft must
    // never leak here just because ?published=true was left off.
    const session = await getServerSession(authOptions);
    const listerRole = (session?.user as { role?: string })?.role;
    const isStaff = !!listerRole && ["SUPERADMIN", "ADMIN", "THERAPIST"].includes(listerRole);

    const articles = await prisma.article.findMany({
      where: isStaff && published !== "true" ? undefined : { published: true },
      // Bodies (content/contentEn/contentPt) are deliberately excluded: no list
      // consumer renders them and including them made this response ~1MB.
      // Full content comes from GET /api/articles/[id].
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        titleEn: true,
        titlePt: true,
        excerptEn: true,
        excerptPt: true,
        publishLanguage: true,
        language: true,
        imageUrl: true,
        imageFocalX: true,
        imageFocalY: true,
        published: true,
        scheduledAt: true,
        authorName: true,
        metaDescription: true,
        metaDescriptionPt: true,
        tags: true,
        keyword: true,
        generatedBy: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit ? parseInt(limit) : undefined,
    });
    
    return NextResponse.json(articles);
  } catch (error) {
    console.error("Error fetching articles:", error);
    if (isDbUnreachableError(error)) {
      return devFallbackResponse(MOCK_ARTICLES);
    }
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    const userRole = (session?.user as { role?: string })?.role;
    if (!session || !userRole || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes(userRole)) {
      return NextResponse.json(
        { error: "Unauthorised" },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const {
      title, excerpt, content, imageUrl, imageFocalX, imageFocalY, published, authorName,
      titleEn, excerptEn, contentEn, titlePt, excerptPt, contentPt, publishLanguage,
      createdAt,
    } = body;

    const pubLang = publishLanguage === "pt" ? "pt" : "en";

    // Resolve per-language versions, falling back to the primary fields for the published language
    const finalTitleEn   = titleEn   ?? (pubLang === "en" ? title   : null);
    const finalExcerptEn = excerptEn ?? (pubLang === "en" ? excerpt : null);
    const finalContentEn = contentEn ?? (pubLang === "en" ? content : null);
    const finalTitlePt   = titlePt   ?? (pubLang === "pt" ? title   : null);
    const finalExcerptPt = excerptPt ?? (pubLang === "pt" ? excerpt : null);
    const finalContentPt = contentPt ?? (pubLang === "pt" ? content : null);

    // Primary (public-facing) fields mirror the published language
    const primaryTitle   = (pubLang === "pt" ? finalTitlePt   : finalTitleEn)   || title;
    const primaryExcerpt = (pubLang === "pt" ? finalExcerptPt : finalExcerptEn) || excerpt;
    const primaryContent = (pubLang === "pt" ? finalContentPt : finalContentEn) || content;

    const slug = primaryTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Publish date shown publicly (used for sorting + display everywhere — see app/articles/*).
    // Defaults to now() (schema default) unless staff picked a different date in the editor.
    const parsedCreatedAt = createdAt ? new Date(createdAt) : null;

    const article = await prisma.article.create({
      data: {
        title: primaryTitle,
        slug,
        excerpt: primaryExcerpt,
        content: primaryContent,
        titleEn: finalTitleEn,
        excerptEn: finalExcerptEn,
        contentEn: finalContentEn,
        titlePt: finalTitlePt,
        excerptPt: finalExcerptPt,
        contentPt: finalContentPt,
        publishLanguage: pubLang,
        language: pubLang,
        imageUrl,
        imageFocalX: typeof imageFocalX === "number" ? imageFocalX : 50,
        imageFocalY: typeof imageFocalY === "number" ? imageFocalY : 50,
        published: published || false,
        authorId: (session.user as { id: string }).id,
        authorName: authorName || null,
        ...(parsedCreatedAt && !isNaN(parsedCreatedAt.getTime()) ? { createdAt: parsedCreatedAt } : {}),
      },
    });
    
    return NextResponse.json(article);
  } catch (error) {
    console.error("Error creating article:", error);
    return NextResponse.json(
      { error: "Failed to create article" },
      { status: 500 }
    );
  }
}
