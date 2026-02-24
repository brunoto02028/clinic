import { prisma } from "@/lib/db";
import Link from "next/link";
import { Calendar, User, BookOpen, ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Articles - Bruno Physical Rehabilitation",
  description: "Evidence-based articles about physiotherapy, rehabilitation, and wellness from Bruno Physical Rehabilitation.",
};

export default async function ArticlesPage() {
  const articles = await prisma.article.findMany({
    where: { published: true },
    include: { author: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Split into featured (first) and rest
  const featured = articles[0] || null;
  const rest = articles.slice(1);

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Our Blog & Articles
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Evidence-based insights on physiotherapy, rehabilitation, and wellness to support your recovery journey.
          </p>
        </div>
      </section>

      {articles.length > 0 ? (
        <section className="py-8 sm:py-12 lg:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Featured Article */}
            {featured && (
              <Link href={`/articles/${featured.slug}`} className="group block mb-10 sm:mb-14">
                <article className="grid lg:grid-cols-2 gap-6 lg:gap-10 items-center bg-card rounded-2xl border border-border shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative aspect-video lg:aspect-[4/3] bg-muted overflow-hidden">
                    {featured.imageUrl ? (
                      <img
                        src={featured.imageUrl}
                        alt={featured.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/5">
                        <BookOpen className="h-16 w-16 text-primary/30" />
                      </div>
                    )}
                  </div>
                  <div className="p-6 lg:p-8 lg:pr-10">
                    <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
                      Featured Article
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors line-clamp-3">
                      {featured.title}
                    </h2>
                    {featured.excerpt && (
                      <p className="text-muted-foreground mb-4 line-clamp-3 leading-relaxed">
                        {featured.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-5">
                      <span className="flex items-center gap-1.5">
                        <User className="h-4 w-4" />
                        {featured.author.firstName} {featured.author.lastName}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        {new Date(featured.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary group-hover:gap-2.5 transition-all">
                      Read article <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </article>
              </Link>
            )}

            {/* Rest of articles */}
            {rest.length > 0 && (
              <>
                <h2 className="text-xl font-bold text-foreground mb-6">All Articles</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                  {rest.map((article) => (
                    <Link key={article.id} href={`/articles/${article.slug}`} className="group">
                      <article className="bg-card rounded-xl shadow-sm border border-border overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col">
                        <div className="relative aspect-video bg-muted overflow-hidden">
                          {article.imageUrl ? (
                            <img
                              src={article.imageUrl}
                              alt={article.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/5">
                              <BookOpen className="h-10 w-10 text-primary/20" />
                            </div>
                          )}
                        </div>
                        <div className="p-5 sm:p-6 flex-1 flex flex-col">
                          <h3 className="font-semibold text-lg text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                            {article.title}
                          </h3>
                          <p className="text-muted-foreground text-sm line-clamp-3 mb-4 flex-1">
                            {article.excerpt}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {article.author.firstName} {article.author.lastName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(article.createdAt).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      ) : (
        <section className="py-16 sm:py-24">
          <div className="max-w-md mx-auto text-center px-4">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No articles published yet</h2>
            <p className="text-muted-foreground mb-6">Check back soon for evidence-based insights on physiotherapy and rehabilitation.</p>
            <Link href="/" className="inline-flex items-center gap-2 text-primary font-medium hover:underline">
              Back to homepage <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
