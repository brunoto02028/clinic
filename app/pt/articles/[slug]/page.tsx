import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import type { Metadata } from "next";
import { authOptions } from "@/lib/auth-options";
import { resolveArticle, buildArticleMetadata, hasPtVersion } from "@/app/articles/[slug]/shared";
import { ArticleView } from "@/app/articles/[slug]/article-view";

const STAFF_ROLES = ["ADMIN", "SUPERADMIN", "THERAPIST"];

export const dynamic = "force-dynamic";

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const article = await resolveArticle(params.slug);
  if (!article || !hasPtVersion(article)) return { title: "Artigo não encontrado" };
  return buildArticleMetadata(article, "pt");
}

export default async function ArticlePagePt({ params }: PageProps) {
  const article = await resolveArticle(params.slug);
  if (!article) notFound();

  // No Portuguese body → the PT URL simply doesn't exist (avoids a thin,
  // duplicate page that would just mirror the English fallback).
  if (!hasPtVersion(article)) notFound();

  if (!article.published) {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    const isStaffPreview = !!session && STAFF_ROLES.includes(role);
    if (!isStaffPreview) notFound();
  }

  return <ArticleView article={article} lang="pt" />;
}
