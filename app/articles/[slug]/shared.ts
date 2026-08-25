// Shared article helpers used by both the English route (app/articles/[slug])
// and the Portuguese route (app/pt/articles/[slug]) — activity 12. The point of
// the split is SEO: each language must be its OWN server-rendered URL, tied to
// the other by hreflang, instead of a single URL translated client-side.

import { prisma } from "@/lib/db";
import type { Metadata } from "next";
import { getSiteSettingsLogo } from "@/lib/get-site-settings";

export const BASE_URL = "https://bpr.clinic";

export type ArticleLang = "en" | "pt";

export function absoluteUrl(url?: string | null): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `${BASE_URL}${url}`;
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** Resolve an article by slug, with fallback matching against slugified titles
 *  (handles legacy URLs whose slug changed after a title edit). */
export async function resolveArticle(slug: string) {
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

/** True when the article has a real Portuguese body (not just a title). */
export function hasPtVersion(article: any): boolean {
  return !!(article?.contentPt && String(article.contentPt).trim());
}

export function estimateReadTime(html: string): number {
  const text = (html || "").replace(/<[^>]*>/g, "");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Sanitise article HTML to fix common rendering issues */
export function sanitizeContent(html: string): string {
  return (html || "").replace(/&nbsp;/g, " ").replace(/ /g, " ");
}

export function pickTitle(a: any, lang: ArticleLang): string {
  return (lang === "pt" ? a.titlePt : a.titleEn) || a.title;
}
export function pickExcerpt(a: any, lang: ArticleLang): string {
  return (lang === "pt" ? a.excerptPt : a.excerptEn) || a.excerpt;
}
export function pickContent(a: any, lang: ArticleLang): string {
  return (lang === "pt" ? a.contentPt : a.contentEn) || a.content;
}

export function enUrlFor(slug: string) {
  return `${BASE_URL}/articles/${slug}`;
}
export function ptUrlFor(slug: string) {
  return `${BASE_URL}/pt/articles/${slug}`;
}

/** Path (not absolute) to a related/other article in the current language.
 *  PT points at /pt only when that article actually has a PT version. */
export function articlePath(lang: ArticleLang, slug: string, otherHasPt: boolean): string {
  return lang === "pt" && otherHasPt ? `/pt/articles/${slug}` : `/articles/${slug}`;
}

export async function buildArticleMetadata(article: any, lang: ArticleLang): Promise<Metadata> {
  let ogImage = absoluteUrl(article.imageUrl);
  if (!ogImage) {
    const logoSettings = await getSiteSettingsLogo();
    ogImage = absoluteUrl(logoSettings?.logoUrl) || `${BASE_URL}/og-image.png`;
  }

  const isPt = lang === "pt";
  const title = pickTitle(article, lang);
  const description =
    (isPt ? article.metaDescriptionPt || article.excerptPt : article.metaDescription || article.excerptEn) ||
    article.metaDescription ||
    article.excerpt ||
    undefined;

  const enUrl = enUrlFor(article.slug);
  const ptUrl = ptUrlFor(article.slug);
  const canonical = isPt ? ptUrl : enUrl;

  // hreflang: always advertise EN + x-default; add PT only when it exists so we
  // never point search engines at a 404 or a duplicate EN fallback.
  const languages: Record<string, string> = { "en-GB": enUrl, "x-default": enUrl };
  if (hasPtVersion(article)) languages["pt-BR"] = ptUrl;

  return {
    title: `${title} - Bruno Physical Rehabilitation`,
    description,
    alternates: { canonical, languages },
    openGraph: {
      title,
      description,
      type: "article",
      url: canonical,
      locale: isPt ? "pt_BR" : "en_GB",
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

/** Static UI strings for the article shell, per language. */
export function articleUi(lang: ArticleLang) {
  const pt = lang === "pt";
  return {
    home: pt ? "Início" : "Home",
    articles: pt ? "Artigos" : "Articles",
    minRead: pt ? "min de leitura" : "min read",
    aboutAuthor: pt ? "Sobre o Autor" : "About the Author",
    specialist: pt ? "Especialista em Reabilitação Física" : "Physical Rehabilitation Specialist",
    articleInfo: pt ? "Informações do Artigo" : "Article Info",
    published: pt ? "Publicado" : "Published",
    readTimeLabel: pt ? "Tempo de leitura" : "Read time",
    min: "min",
    related: pt ? "Artigos Relacionados" : "Related Articles",
    viewAll: pt ? "Ver todos os artigos" : "View all articles",
    backToAll: pt ? "Voltar para todos os artigos" : "Back to all articles",
    moreArticles: pt ? "Mais Artigos" : "More Articles",
    prevArticle: pt ? "Artigo Anterior" : "Previous Article",
    nextArticle: pt ? "Próximo Artigo" : "Next Article",
    illustrative: pt ? "Imagem meramente ilustrativa" : "Image for illustrative purposes only",
    draft: pt
      ? "👁️ Prévia de rascunho — este artigo ainda não foi publicado. Visível apenas para a equipe."
      : "👁️ Draft preview — this article is not published yet. Only visible to staff.",
    readInPt: "Ler em português",
    readInEn: "Read in English",
    dateLocale: pt ? "pt-BR" : "en-GB",
  };
}
