import { prisma } from "@/lib/db";
import Link from "next/link";
import Image from "next/image";
import { Calendar, User, ChevronLeft, ChevronRight, BookOpen, ArrowLeft, Clock, Languages } from "lucide-react";
import { ArticleAudioPlayer } from "./audio-player";
import { isTtsEnabled } from "@/lib/eleven-labs";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { LeadMagnetCapture } from "@/components/lead-magnet-capture";
import { BookCta } from "@/components/book-cta";
import { articleQualifiesForBookCta } from "@/lib/book-cta-config";
import { extractFaqPairs, buildFaqPageSchema, buildArticleSchema } from "@/lib/article-schema";
import { ArticleLangSync } from "./lang-sync";
import {
  type ArticleLang,
  absoluteUrl,
  estimateReadTime,
  sanitizeContent,
  pickTitle,
  pickExcerpt,
  pickContent,
  hasPtVersion,
  enUrlFor,
  ptUrlFor,
  articlePath,
  articleUi,
} from "./shared";

const RELATED_SELECT = {
  id: true,
  slug: true,
  title: true,
  titleEn: true,
  titlePt: true,
  excerpt: true,
  excerptEn: true,
  excerptPt: true,
  imageUrl: true,
  imageFocalX: true,
  imageFocalY: true,
  createdAt: true,
} as const;

/** Server-rendered article page in a fixed language (activity 12). Both the EN
 *  and PT routes render through here so each URL is crawlable in its own
 *  language — no client-side translation for the primary content. */
export async function ArticleView({ article, lang }: { article: any; lang: ArticleLang }) {
  const t = articleUi(lang);
  const isPt = lang === "pt";

  const title = pickTitle(article, lang);
  const excerpt = pickExcerpt(article, lang);
  const content = pickContent(article, lang);
  const readTime = estimateReadTime(sanitizeContent(content || ""));
  const authorName = article.authorName || `${article.author.firstName} ${article.author.lastName}`;
  const dateFmt = (d: Date | string, opts: Intl.DateTimeFormatOptions) =>
    new Date(d).toLocaleDateString(t.dateLocale, opts);

  const canonicalUrl = isPt ? ptUrlFor(article.slug) : enUrlFor(article.slug);
  const articleHasPt = hasPtVersion(article);

  // Structured data in the page's own language.
  const articleSchema = buildArticleSchema({
    url: canonicalUrl,
    title,
    description: excerpt,
    imageUrl: absoluteUrl(article.imageUrl),
    authorName,
    datePublished: article.createdAt,
    dateModified: article.updatedAt,
  });
  const faqPairs = extractFaqPairs(content);
  const faqSchema = buildFaqPageSchema(faqPairs);

  const [prevArticle, nextArticle, relatedArticles] = await Promise.all([
    prisma.article.findFirst({
      where: { published: true, createdAt: { gt: article.createdAt } },
      orderBy: { createdAt: "asc" },
      select: { slug: true, title: true, titleEn: true, titlePt: true },
    }),
    prisma.article.findFirst({
      where: { published: true, createdAt: { lt: article.createdAt } },
      orderBy: { createdAt: "desc" },
      select: { slug: true, title: true, titleEn: true, titlePt: true },
    }),
    prisma.article.findMany({
      where: { published: true, id: { not: article.id } },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: RELATED_SELECT,
    }),
  ]);

  // For internal links we treat a present titlePt as "has a PT version"
  // (translations write titlePt/excerptPt/contentPt together).
  const otherTitle = (a: any) => (isPt ? a.titlePt : a.titleEn) || a.title;
  const otherExcerpt = (a: any) => (isPt ? a.excerptPt : a.excerptEn) || a.excerpt;
  const otherHref = (a: any) => articlePath(lang, a.slug, !!a.titlePt);

  return (
    <>
      <ArticleLangSync
        lang={lang}
        enHref={`/articles/${article.slug}`}
        ptHref={articleHasPt ? `/pt/articles/${article.slug}` : null}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}
      {!article.published && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-700 dark:text-amber-400 text-center text-sm font-semibold py-2.5 px-4">
          {t.draft}
        </div>
      )}
      {/* Breadcrumb */}
      <div className="bg-muted/30 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">{t.home}</Link>
            <span>/</span>
            <Link href={"/articles"} className="hover:text-foreground transition-colors">{t.articles}</Link>
            <span>/</span>
            <span className="text-foreground truncate max-w-[300px]">{title}</span>
          </nav>
        </div>
      </div>

      {/* Cover Image — Full Width */}
      {article.imageUrl && (
        <div className="relative w-full h-[300px] sm:h-[400px] lg:h-[480px] bg-muted overflow-hidden">
          <Image
            src={article.imageUrl}
            alt={title}
            fill
            priority
            sizes="100vw"
            quality={75}
            className="object-cover"
            style={{ objectPosition: `${article.imageFocalX ?? 50}% ${article.imageFocalY ?? 50}%` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 lg:p-12">
            <div className="max-w-7xl mx-auto">
              <h1 className="font-sora text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white leading-tight max-w-4xl tracking-tight">
                {title}
              </h1>
            </div>
          </div>
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
            <span className="text-[10px] sm:text-xs text-white/70 bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-1">
              {t.illustrative}
            </span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 overflow-hidden">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-8 lg:gap-12">
          {/* Article Content — Left */}
          <article className="min-w-0 overflow-hidden">
            {!article.imageUrl && (
              <h1 className="font-sora text-3xl sm:text-4xl font-bold text-foreground mb-6 leading-tight tracking-tight">
                {title}
              </h1>
            )}

            {/* Meta bar */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6 pb-6 border-b border-border">
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4" />
                {authorName}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {dateFmt(article.createdAt, { day: "numeric", month: "long", year: "numeric" })}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {readTime} {t.minRead}
              </span>
              {/* Language cross-link (hreflang for humans) */}
              {isPt ? (
                <Link href={`/articles/${article.slug}`} className="flex items-center gap-1.5 text-primary font-medium hover:underline">
                  <Languages className="h-4 w-4" />
                  {t.readInEn}
                </Link>
              ) : (
                articleHasPt && (
                  <Link href={`/pt/articles/${article.slug}`} className="flex items-center gap-1.5 text-primary font-medium hover:underline">
                    <Languages className="h-4 w-4" />
                    {t.readInPt}
                  </Link>
                )
              )}
            </div>

            {isTtsEnabled() && (
              <div className="mb-8">
                <ArticleAudioPlayer articleId={article.id} />
              </div>
            )}

            {excerpt && (
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed italic border-l-4 border-primary/30 pl-4 block">
                {excerpt}
              </p>
            )}

            <div
              className="article-content prose prose-lg max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary hover:prose-a:text-primary/80 prose-img:rounded-xl prose-img:shadow-md prose-strong:text-foreground prose-blockquote:border-l-primary/30 prose-blockquote:text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: sanitizeContent(content) }}
            />

            <LeadMagnetCapture tags={article.tags || []} articleSlug={article.slug} />

            {articleQualifiesForBookCta(article.tags) && <BookCta />}

            <MedicalDisclaimer />

            {/* Prev/Next Navigation */}
            <nav className="mt-12 pt-8 border-t border-border">
              <div className="flex items-stretch gap-4">
                {prevArticle ? (
                  <Link
                    href={otherHref(prevArticle)}
                    className="flex-1 group p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <ChevronLeft className="h-4 w-4" />
                      {t.prevArticle}
                    </div>
                    <p className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {otherTitle(prevArticle)}
                    </p>
                  </Link>
                ) : (
                  <div className="flex-1" />
                )}
                {nextArticle ? (
                  <Link
                    href={otherHref(nextArticle)}
                    className="flex-1 group p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors text-right"
                  >
                    <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground mb-1">
                      {t.nextArticle}
                      <ChevronRight className="h-4 w-4" />
                    </div>
                    <p className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {otherTitle(nextArticle)}
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
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">{t.aboutAuthor}</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{authorName}</p>
                  <p className="text-sm text-muted-foreground">{t.specialist}</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">{t.articleInfo}</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t.published}</dt>
                  <dd className="font-medium text-foreground">
                    {dateFmt(article.createdAt, { day: "numeric", month: "short", year: "numeric" })}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t.readTimeLabel}</dt>
                  <dd className="font-medium text-foreground">{readTime} {t.min}</dd>
                </div>
              </dl>
            </div>

            {relatedArticles.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">{t.related}</h3>
                <div className="space-y-4">
                  {relatedArticles.slice(0, 4).map((related: any) => (
                    <Link key={related.id} href={otherHref(related)} className="group flex gap-3">
                      {related.imageUrl ? (
                        <div className="relative w-16 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                          <Image src={related.imageUrl} alt="" fill sizes="64px" loading="lazy" quality={60} className="object-cover" style={{ objectPosition: `${related.imageFocalX ?? 50}% ${related.imageFocalY ?? 50}%` }} />
                        </div>
                      ) : (
                        <div className="w-16 h-12 rounded-md bg-primary/5 flex items-center justify-center flex-shrink-0">
                          <BookOpen className="h-4 w-4 text-primary/30" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                          {otherTitle(related)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {dateFmt(related.createdAt, { day: "numeric", month: "short" })}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
                <Link
                  href={"/articles"}
                  className="block mt-4 pt-3 border-t border-border text-sm text-primary font-medium hover:underline text-center"
                >
                  {t.viewAll}
                </Link>
              </div>
            )}

            <Link
              href={"/articles"}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              {t.backToAll}
            </Link>
          </aside>
        </div>
      </div>

      {/* More Articles — Full Width Section */}
      {relatedArticles.length > 0 && (
        <section className="bg-muted/30 border-t border-border py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-sora text-2xl font-bold text-foreground mb-8 tracking-tight">{t.moreArticles}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {relatedArticles.map((related: any) => (
                <Link key={related.id} href={otherHref(related)} className="group">
                  <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col">
                    <div className="relative aspect-video bg-muted overflow-hidden">
                      {related.imageUrl ? (
                        <Image src={related.imageUrl} alt={otherTitle(related)} fill sizes="(min-width: 1280px) 300px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" loading="lazy" quality={65} className="object-cover group-hover:scale-105 transition-transform duration-300" style={{ objectPosition: `${related.imageFocalX ?? 50}% ${related.imageFocalY ?? 50}%` }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/5">
                          <BookOpen className="h-8 w-8 text-primary/20" />
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-semibold text-foreground text-sm mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {otherTitle(related)}
                      </h3>
                      {otherExcerpt(related) && (
                        <p className="text-muted-foreground text-xs line-clamp-2 flex-1">{otherExcerpt(related)}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {dateFmt(related.createdAt, { day: "numeric", month: "short", year: "numeric" })}
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
