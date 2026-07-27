import { prisma } from "@/lib/db";
import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { ArticlesBrowser } from "@/components/articles/articles-browser";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Articles - Bruno Physical Rehabilitation",
  description: "Evidence-based articles about physical rehabilitation and wellness from Bruno Physical Rehabilitation.",
};

export default async function ArticlesPage() {
  const articles = await prisma.article.findMany({
    where: { published: true },
    select: {
      id: true,
      slug: true,
      title: true,
      titleEn: true,
      titlePt: true,
      excerpt: true,
      excerptEn: true,
      excerptPt: true,
      imageUrl: true,
      createdAt: true,
      tags: true,
      authorName: true,
      author: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-sora text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
            Our Blog & Articles
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Evidence-based insights on physical rehabilitation and wellness to support your recovery journey.
          </p>
        </div>
      </section>

      {articles.length > 0 ? (
        <section className="py-8 sm:py-12 lg:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ArticlesBrowser articles={articles} />
          </div>
        </section>
      ) : (
        <section className="py-16 sm:py-24">
          <div className="max-w-md mx-auto text-center px-4">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No articles published yet</h2>
            <p className="text-muted-foreground mb-6">Check back soon for evidence-based insights on physical rehabilitation.</p>
            <Link href="/" className="inline-flex items-center gap-2 text-primary font-medium hover:underline">
              Back to homepage <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
