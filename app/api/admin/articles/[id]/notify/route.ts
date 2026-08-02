import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { sendArticleNewsletter } from "@/lib/article-newsletter";

export const dynamic = "force-dynamic";

function authGuard(session: any) {
  const role = session?.user?.role;
  return session && ["SUPERADMIN", "ADMIN", "THERAPIST"].includes(role);
}

// POST /api/admin/articles/[id]/notify
// Manually (re-)sends the newsletter for an already-published article.
// Independent of the publish action — gives staff full freedom to notify
// subscribers whenever they choose, not only at publish time.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!authGuard(session)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const article = await prisma.article.findUnique({ where: { id: params.id } });
  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }
  if (!article.published) {
    return NextResponse.json({ error: "Article must be published before notifying subscribers" }, { status: 400 });
  }

  const result = await sendArticleNewsletter(article);
  return NextResponse.json({ success: true, ...result });
}
