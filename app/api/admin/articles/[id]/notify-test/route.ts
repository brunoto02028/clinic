import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { sendTestArticleNewsletter } from "@/lib/article-newsletter";

export const dynamic = "force-dynamic";

function authGuard(session: any) {
  const role = session?.user?.role;
  return session && ["SUPERADMIN", "ADMIN", "THERAPIST"].includes(role);
}

// POST /api/admin/articles/[id]/notify-test
// Sends a single test copy of the newsletter email to a chosen address —
// does not touch the subscriber list or count as a real send.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!authGuard(session)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { locale, email } = await request.json();
  const targetLocale = locale === "pt" ? "pt" : "en";
  const targetEmail = (email || (session as any)?.user?.email || "").trim();

  if (!targetEmail || !targetEmail.includes("@")) {
    return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
  }

  const article = await prisma.article.findUnique({ where: { id: params.id } });
  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  const result = await sendTestArticleNewsletter(article, targetLocale, targetEmail);
  if (!result.success) {
    return NextResponse.json({ error: result.error || "Failed to send test email" }, { status: 500 });
  }

  return NextResponse.json({ success: true, sentTo: targetEmail });
}
