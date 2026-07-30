"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, User, BookOpen, ArrowRight, Search, X } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { LocalizedText } from "@/app/articles/[slug]/localized";

/** Known tag translations for the category pills. Unknown tags fall back to the raw English label. */
const TAG_LABELS: Record<string, { en: string; pt: string }> = {
  "Knee": { en: "Knee", pt: "Joelho" },
  "Ankle": { en: "Ankle", pt: "Tornozelo" },
  "Back Pain": { en: "Back Pain", pt: "Dor nas Costas" },
  "Sciatica": { en: "Sciatica", pt: "Ciática" },
  "Injury Prevention": { en: "Injury Prevention", pt: "Prevenção de Lesões" },
  "Recovery Science": { en: "Recovery Science", pt: "Ciência da Recuperação" },
  "Technology": { en: "Technology", pt: "Tecnologia" },
  "Osteoarthritis": { en: "Osteoarthritis", pt: "Osteoartrite" },
  "Hip": { en: "Hip", pt: "Anca" },
  "Shoulder": { en: "Shoulder", pt: "Ombro" },
  "Neck": { en: "Neck", pt: "Pescoço" },
  "Hand & Wrist": { en: "Hand & Wrist", pt: "Mão e Pulso" },
  "Foot": { en: "Foot", pt: "Pé" },
};

function tagLabel(tag: string, isPt: boolean) {
  return TAG_LABELS[tag]?.[isPt ? "pt" : "en"] || tag;
}

export interface ArticleListItem {
  id: string;
  slug: string;
  title: string;
  titleEn?: string | null;
  titlePt?: string | null;
  excerpt: string;
  excerptEn?: string | null;
  excerptPt?: string | null;
  imageUrl?: string | null;
  createdAt: Date | string;
  tags: string[];
  authorName?: string | null;
  author: { firstName: string; lastName: string };
}

export function ArticlesBrowser({ articles }: { articles: ArticleListItem[] }) {
  const { locale } = useLocale();
  const isPt = locale.startsWith("pt");
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const present = new Set<string>();
    articles.forEach((a) => (a.tags || []).forEach((t) => present.add(t)));
    // Only show curated top-level categories as pills (not every raw per-article tag/keyword)
    return Object.keys(TAG_LABELS).filter((t) => present.has(t));
  }, [articles]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter((a) => {
      if (activeTag && !(a.tags || []).includes(activeTag)) return false;
      if (!q) return true;
      const title = (isPt ? a.titlePt : a.titleEn) || a.title;
      const excerpt = (isPt ? a.excerptPt : a.excerptEn) || a.excerpt;
      const haystack = `${title} ${excerpt} ${(a.tags || []).join(" ")}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [articles, query, activeTag, isPt]);

  const isFiltering = query.trim().length > 0 || !!activeTag;
  const featured = !isFiltering ? filtered[0] || null : null;
  const rest = isFiltering ? filtered : filtered.slice(1);

  return (
    <>
      {/* Search + category pills */}
      <div className="mb-10 sm:mb-14 space-y-4">
        <div className="relative max-w-lg mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isPt ? "Buscar artigos por palavra-chave..." : "Search articles by keyword..."}
            className="w-full bg-card border border-border rounded-full pl-11 pr-10 py-3 text-sm text-foreground outline-none focus:border-primary transition-colors placeholder-muted-foreground/60"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={isPt ? "Limpar busca" : "Clear search"}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => setActiveTag(null)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                !activeTag
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {isPt ? "Todos" : "All"}
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  activeTag === tag
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {tagLabel(tag, isPt)}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 sm:py-24 text-center px-4">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {isPt ? "Nenhum artigo encontrado" : "No articles found"}
          </h2>
          <p className="text-muted-foreground">
            {isPt ? "Tente outra palavra-chave ou remova o filtro." : "Try a different keyword or clear the filter."}
          </p>
        </div>
      ) : (
        <>
          {featured && (
            <Link href={`/articles/${featured.slug}`} className="group block mb-10 sm:mb-14">
              <article className="grid lg:grid-cols-2 gap-6 lg:gap-10 items-center bg-card rounded-2xl border border-border shadow-sm overflow-hidden hover:shadow-lg transition-shadow border-t-[3px] border-t-[#4F7361]">
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
                    {isPt ? "Artigo em Destaque" : "Featured Article"}
                  </div>
                  <LocalizedText as="h2" className="font-sora text-2xl sm:text-3xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors line-clamp-3 block tracking-tight" en={featured.titleEn} pt={featured.titlePt} fallback={featured.title} />
                  {featured.excerpt && (
                    <LocalizedText as="p" className="text-muted-foreground mb-4 line-clamp-3 leading-relaxed" en={featured.excerptEn} pt={featured.excerptPt} fallback={featured.excerpt} />
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-5">
                    <span className="flex items-center gap-1.5">
                      <User className="h-4 w-4" />
                      {featured.authorName || `${featured.author.firstName} ${featured.author.lastName}`}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      {new Date(featured.createdAt).toLocaleDateString(isPt ? "pt-BR" : "en-GB", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary group-hover:gap-2.5 transition-all">
                    {isPt ? "Ler artigo" : "Read article"} <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </article>
            </Link>
          )}

          {rest.length > 0 && (
            <>
              {!isFiltering && (
                <h2 className="font-sora text-xl font-bold text-foreground mb-6 tracking-tight">
                  {isPt ? "Todos os Artigos" : "All Articles"}
                </h2>
              )}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {rest.map((article) => (
                  <Link key={article.id} href={`/articles/${article.slug}`} className="group">
                    <article className="bg-card rounded-xl shadow-sm border border-border overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col border-t-[3px] border-t-[#4F7361]">
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
                        <LocalizedText as="h3" className="font-sora font-semibold text-lg text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors block" en={article.titleEn} pt={article.titlePt} fallback={article.title} />
                        <p className="text-muted-foreground text-sm line-clamp-3 mb-4 flex-1">
                          <LocalizedText en={article.excerptEn} pt={article.excerptPt} fallback={article.excerpt} />
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {article.authorName || `${article.author.firstName} ${article.author.lastName}`}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(article.createdAt).toLocaleDateString(isPt ? "pt-BR" : "en-GB", {
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
        </>
      )}
    </>
  );
}
