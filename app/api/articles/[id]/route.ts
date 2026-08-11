import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { sendArticleNewsletter } from "@/lib/article-newsletter";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const article = await prisma.article.findUnique({
      where: { id: params.id },
      include: {
        author: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error("Error fetching article:", error);
    return NextResponse.json(
      { error: "Failed to fetch article" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    const userRole = (session?.user as { role?: string })?.role;
    if (!session || !userRole || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title, excerpt, content, imageUrl, imageFocalX, imageFocalY, published, authorName, metaDescription, metaDescriptionPt, tags, keyword,
      titleEn, excerptEn, contentEn, titlePt, excerptPt, contentPt, publishLanguage,
      notifySubscribers, scheduledAt, createdAt,
    } = body;

    const updateData: Record<string, unknown> = {};

    // ── Bilingual handling ──
    const isBilingual =
      publishLanguage !== undefined ||
      titleEn !== undefined || excerptEn !== undefined || contentEn !== undefined ||
      titlePt !== undefined || excerptPt !== undefined || contentPt !== undefined;

    if (isBilingual) {
      const pubLang = publishLanguage === "pt" ? "pt" : "en";
      const enT = titleEn   ?? (pubLang === "en" ? title   : null);
      const enE = excerptEn ?? (pubLang === "en" ? excerpt : null);
      const enC = contentEn ?? (pubLang === "en" ? content : null);
      const ptT = titlePt   ?? (pubLang === "pt" ? title   : null);
      const ptE = excerptPt ?? (pubLang === "pt" ? excerpt : null);
      const ptC = contentPt ?? (pubLang === "pt" ? content : null);

      updateData.titleEn = enT;
      updateData.excerptEn = enE;
      updateData.contentEn = enC;
      updateData.titlePt = ptT;
      updateData.excerptPt = ptE;
      updateData.contentPt = ptC;
      updateData.publishLanguage = pubLang;
      updateData.language = pubLang;

      // Primary (public-facing) fields mirror the published language
      const primaryTitle   = (pubLang === "pt" ? ptT : enT) || title;
      const primaryExcerpt = (pubLang === "pt" ? ptE : enE) || excerpt;
      const primaryContent = (pubLang === "pt" ? ptC : enC) || content;
      // NOTE: slug is intentionally NOT regenerated on update — public URLs must stay stable.
      if (primaryTitle !== undefined && primaryTitle !== null) {
        updateData.title = primaryTitle;
      }
      if (primaryExcerpt !== undefined) updateData.excerpt = primaryExcerpt;
      if (primaryContent !== undefined) updateData.content = primaryContent;
    } else {
      // Legacy single-language update (slug intentionally kept stable)
      if (title !== undefined) {
        updateData.title = title;
      }
      if (excerpt !== undefined) updateData.excerpt = excerpt;
      if (content !== undefined) updateData.content = content;
    }

    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (imageFocalX !== undefined) updateData.imageFocalX = imageFocalX;
    if (imageFocalY !== undefined) updateData.imageFocalY = imageFocalY;
    if (published !== undefined) updateData.published = published;
    if (authorName !== undefined) updateData.authorName = authorName || null;
    if (metaDescription !== undefined) updateData.metaDescription = metaDescription;
    if (metaDescriptionPt !== undefined) updateData.metaDescriptionPt = metaDescriptionPt;
    if (tags !== undefined) updateData.tags = tags;
    if (keyword !== undefined) updateData.keyword = keyword;
    if (scheduledAt !== undefined) updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    // Publish date shown publicly (used for sorting + display everywhere — see app/articles/*).
    // Staff can backdate/postdate it from the admin editor's date picker.
    if (createdAt) {
      const parsed = new Date(createdAt);
      if (!isNaN(parsed.getTime())) updateData.createdAt = parsed;
    }

    const article = await prisma.article.update({
      where: { id: params.id },
      data: updateData,
    });

    // ── Newsletter: opt-in only. Staff must explicitly request notifySubscribers=true
    //    (e.g. via a "Notify subscribers" checkbox in the publish dialog). Never automatic. ──
    if (notifySubscribers === true) {
      sendArticleNewsletter(article).catch(err =>
        console.error('[newsletter] send error:', err)
      );
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error("Error updating article:", error);
    return NextResponse.json(
      { error: "Failed to update article" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    const userRole = (session?.user as { role?: string })?.role;
    if (!session || !userRole || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    await prisma.article.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting article:", error);
    return NextResponse.json(
      { error: "Failed to delete article" },
      { status: 500 }
    );
  }
}
