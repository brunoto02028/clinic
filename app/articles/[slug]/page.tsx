import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, User, ChevronLeft, ChevronRight, BookOpen, ArrowLeft, Clock, Share2 } from "lucide-react";
import type { Metadata } from "next";
import { LocalizedText, LocalizedHtml } from "./localized";
import { getSiteSettingsLogo } from "@/lib/get-site-settings";

const BASE_URL = "https://bpr.rehab";
function absoluteUrl(url?: string | null): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `${BASE_URL}${url}`;
}

export const dynamic = "force-dynamic";

interface PageProps {
  params: { slug: string };
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** Resolve an article by slug, with fallback matching against slugified titles
 *  (handles legacy URLs whose slug changed after a title edit). */
async function resolveArticle(slug: string) {
  const direct = await prisma.article.findUnique({
    where: { slug },
    include: { author: { select: { firstName: true, lastName: true } } },
  });
  if (direct) return direct;

  const candidates = await (prisma as any).article.findMany({
    where: { published: true },
    select: { id: true, title: true, titleEn: true, titlePt: true },
  });
  const match = candidates.find((c: any) =>
    [c.title, c.titleEn, c.titlePt].filter(Boolean).some((t: string) => slugify(t) === slug)
  );
  if (!match) return null;

  return prisma.article.findUnique({
    where: { id: match.id },
    include: { author: { select: { firstName: true, lastName: true } } },
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const article = await resolveArticle(params.slug);
  if (!article) return { title: "Article Not Found" };

  let ogImage = absoluteUrl(article.imageUrl);
  if (!ogImage) {
    const logoSettings = await getSiteSettingsLogo();
    ogImage = absoluteUrl(logoSettings?.logoUrl) || `${BASE_URL}/og-image.png`;
  }

  return {
    title: `${article.title} - Bruno Physical Rehabilitation`,
    description: article.excerpt || undefined,
    openGraph: {
      title: article.title,
      description: article.excerpt || undefined,
      type: "article",
      images: [{ url: ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt || undefined,
      images: [ogImage],
    },
  };
}

function estimateReadTime(html: string): number {
  const text = html.replace(/<[^>]*>/g, "");
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

/** Sanitise article HTML to fix common rendering issues */
function sanitizeContent(html: string): string {
  return html
    // Replace &nbsp; with regular spaces (prevents word-wrap)
    .replace(/&nbsp;/g, " ")
    // Replace non-breaking space unicode character
    .replace(/\u00A0/g, " ");
}

export default async function ArticlePage({ params }: PageProps) {
  const article = await resolveArticle(params.slug);

  if (!article || !article.published) notFound();

  const readTime = estimateReadTime(article.content || "");

  // Get prev/next articles
  const [prevArticle, nextArticle] = await Promise.all([
    prisma.article.findFirst({
      where: { published: true, createdAt: { gt: article.createdAt } },
      orderBy: { createdAt: "asc" },
      select: { slug: true, title: true },
    }),
    prisma.article.findFirst({
      where: { published: true, createdAt: { lt: article.createdAt } },
      orderBy: { createdAt: "desc" },
      select: { slug: true, title: true },
    }),
  ]);

  // Get related articles (latest 4 excluding current)
  const relatedArticles = await prisma.article.findMany({
    where: { published: true, id: { not: article.id } },
    orderBy: { createdAt: "desc" },
    take: 4,
    select: { id: true, slug: true, title: true, excerpt: true, imageUrl: true, createdAt: true },
  });

  return (
    <>
      {/* Breadcrumb */}
      <div className="bg-muted/30 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <span>/</span>
            <Link href="/articles" className="hover:text-foreground transition-colors">Articles</Link>
            <span>/</span>
            <LocalizedText as="span" className="text-foreground truncate max-w-[300px]" en={article.titleEn} pt={article.titlePt} fallback={article.title} />
          </nav>
        </div>
      </div>

      {/* Cover Image — Full Width */}
      {article.imageUrl && (
        <div className="relative w-full h-[300px] sm:h-[400px] lg:h-[480px] bg-muted overflow-hidden">
          <img
            src={article.imageUrl}
            alt={article.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 lg:p-12">
            <div className="max-w-7xl mx-auto">
              <LocalizedText as="h1" className="font-sora text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white leading-tight max-w-4xl tracking-tight" en={article.titleEn} pt={article.titlePt} fallback={article.title} />
            </div>
          </div>
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
            <LocalizedText as="span" className="text-[10px] sm:text-xs text-white/70 bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-1" en="Image for illustrative purposes only" pt="Imagem meramente ilustrativa" fallback="Image for illustrative purposes only" />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 overflow-hidden">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-8 lg:gap-12">
          {/* Article Content — Left */}
          <article className="min-w-0 overflow-hidden">
            {/* Title (if no cover image) */}
            {!article.imageUrl && (
              <LocalizedText as="h1" className="font-sora text-3xl sm:text-4xl font-bold text-foreground mb-6 leading-tight tracking-tight" en={article.titleEn} pt={article.titlePt} fallback={article.title} />
            )}

            {/* Meta bar */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6 pb-6 border-b border-border">
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4" />
                {(article as any).authorName || `${article.author.firstName} ${article.author.lastName}`}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {new Date(article.createdAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {readTime} min read
              </span>
            </div>

            {/* Excerpt */}
            {article.excerpt && (
              <LocalizedText as="p" className="text-lg text-muted-foreground mb-8 leading-relaxed italic border-l-4 border-primary/30 pl-4 block" en={article.excerptEn} pt={article.excerptPt} fallback={article.excerpt} />
            )}

            {/* Content */}
            <LocalizedHtml
              className="article-content prose prose-lg max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary hover:prose-a:text-primary/80 prose-img:rounded-xl prose-img:shadow-md prose-strong:text-foreground prose-blockquote:border-l-primary/30 prose-blockquote:text-muted-foreground"
              en={article.contentEn}
              pt={article.contentPt}
              fallback={article.content}
            />

            {/* Prev/Next Navigation */}
            <nav className="mt-12 pt-8 border-t border-border">
              <div className="flex items-stretch gap-4">
                {prevArticle ? (
                  <Link
                    href={`/articles/${prevArticle.slug}`}
                    className="flex-1 group p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <ChevronLeft className="h-4 w-4" />
                      Previous Article
                    </div>
                    <p className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {prevArticle.title}
                    </p>
                  </Link>
                ) : (
                  <div className="flex-1" />
                )}
                {nextArticle ? (
                  <Link
                    href={`/articles/${nextArticle.slug}`}
                    className="flex-1 group p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors text-right"
                  >
                    <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground mb-1">
                      Next Article
                      <ChevronRight className="h-4 w-4" />
                    </div>
                    <p className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {nextArticle.title}
                    </p>
                  </Link>
                ) : (
                  <div className="flex-1" />
                )}
              </div>
            </nav>
          </article>

          {/* Sidebar — Right */}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            {/* Author Card */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">About the Author</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {(article as any).authorName || `${article.author.firstName} ${article.author.lastName}`}
                  </p>
                  <LocalizedText as="p" className="text-sm text-muted-foreground" en="Physical Rehabilitation Specialist" pt="Especialista em Reabilitação Física" fallback="Physical Rehabilitation Specialist" />
                </div>
              </div>
            </div>

            {/* Article Info */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Article Info</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Published</dt>
                  <dd className="font-medium text-foreground">
                    {new Date(article.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Read time</dt>
                  <dd className="font-medium text-foreground">{readTime} min</dd>
                </div>
              </dl>
            </div>

            {/* Related Articles (sidebar) */}
            {relatedArticles.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Related Articles</h3>
                <div className="space-y-4">
                  {relatedArticles.slice(0, 4).map((related) => (
                    <Link key={related.id} href={`/articles/${related.slug}`} className="group flex gap-3">
                      {related.imageUrl ? (
                        <div className="w-16 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                          <img src={related.imageUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-12 rounded-md bg-primary/5 flex items-center justify-center flex-shrink-0">
                          <BookOpen className="h-4 w-4 text-primary/30" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                          {related.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(related.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
                <Link
                  href="/articles"
                  className="block mt-4 pt-3 border-t border-border text-sm text-primary font-medium hover:underline text-center"
                >
                  View all articles
                </Link>
              </div>
            )}

            {/* Back to Articles */}
            <Link
              href="/articles"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to all articles
            </Link>
          </aside>
        </div>
      </div>

      {/* More Articles — Full Width Section */}
      {relatedArticles.length > 0 && (
        <section className="bg-muted/30 border-t border-border py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-sora text-2xl font-bold text-foreground mb-8 tracking-tight">More Articles</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {relatedArticles.map((related) => (
                <Link key={related.id} href={`/articles/${related.slug}`} className="group">
                  <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col">
                    <div className="relative aspect-video bg-muted overflow-hidden">
                      {related.imageUrl ? (
                        <img src={related.imageUrl} alt={related.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/5">
                          <BookOpen className="h-8 w-8 text-primary/20" />
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-semibold text-foreground text-sm mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {related.title}
                      </h3>
                      {related.excerpt && (
                        <p className="text-muted-foreground text-xs line-clamp-2 flex-1">{related.excerpt}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(related.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
