import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { previewArticleNewsletter, getSubscriberCounts } from "@/lib/article-newsletter";

export const dynamic = "force-dynamic";

function authGuard(session: any) {
  const role = session?.user?.role;
  return session && ["SUPERADMIN", "ADMIN", "THERAPIST"].includes(role);
}

// GET /api/admin/articles/[id]/notify-preview?locale=en|pt
// Renders the newsletter email for this article without sending anything.
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!authGuard(session)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("locale") === "pt" ? "pt" : "en";

  const article = await prisma.article.findUnique({ where: { id: params.id } });
  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  const [rendered, counts] = await Promise.all([
    previewArticleNewsletter(article, locale),
    getSubscriberCounts(),
  ]);

  if (!rendered) {
    return NextResponse.json({ error: "Newsletter template not available" }, { status: 500 });
  }

  return NextResponse.json({ ...rendered, counts });
}
