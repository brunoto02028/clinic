import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { renderTemplate } from "@/lib/email-templates";
import { sendEmail } from "@/lib/email";

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
    const { title, excerpt, content, imageUrl, published, authorName } = body;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) {
      updateData.title = title;
      updateData.slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (content !== undefined) updateData.content = content;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (published !== undefined) updateData.published = published;
    if (authorName !== undefined) updateData.authorName = authorName || null;

    // Fetch current state before update to detect publish transition
    const existing = await prisma.article.findUnique({ where: { id: params.id }, select: { published: true, slug: true } });

    const article = await prisma.article.update({
      where: { id: params.id },
      data: updateData,
    });

    // ── Newsletter trigger: fire-and-forget when article is first published ──
    if (published === true && existing && !existing.published) {
      triggerArticleNewsletter(article).catch(err =>
        console.error('[newsletter] trigger error:', err)
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

// ── Background newsletter sender ────────────────────────────────────────────
async function triggerArticleNewsletter(article: { id: string; title: string; excerpt?: string | null; imageUrl?: string | null; slug: string }) {
  const BASE = process.env.NEXTAUTH_URL || 'https://clinic.bpr.rehab';
  const articleUrl = `${BASE}/articles/${article.slug}`;

  const contacts = await (prisma as any).emailContact.findMany({
    where: { subscribed: true },
    select: { id: true, email: true, firstName: true },
  });

  if (contacts.length === 0) return;

  const BATCH = 10;
  const DELAY_MS = 300_000; // 5 minutes between batches

  const sendBatch = async (batch: typeof contacts) => {
    for (const contact of batch) {
      try {
        const unsubscribeUrl = `${BASE}/unsubscribe?email=${encodeURIComponent(contact.email)}`;
        const rendered = await renderTemplate('ARTICLE_NEWSLETTER', {
          recipientName: contact.firstName || 'Reader',
          articleTitle: article.title,
          articleExcerpt: article.excerpt || '',
          articleImageUrl: article.imageUrl || '',
          articleUrl,
          unsubscribeUrl,
        });
        if (!rendered) continue;
        await sendEmail({ to: contact.email, subject: rendered.subject, html: rendered.html });
      } catch (err) {
        console.error(`[newsletter] failed for ${contact.email}:`, err);
      }
    }
  };

  for (let i = 0; i < contacts.length; i += BATCH) {
    const batch = contacts.slice(i, i + BATCH);
    if (i === 0) {
      await sendBatch(batch);
    } else {
      setTimeout(() => sendBatch(batch), (i / BATCH) * DELAY_MS);
    }
  }

  console.log(`[newsletter] triggered for article "${article.title}" to ${contacts.length} contacts`);
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
