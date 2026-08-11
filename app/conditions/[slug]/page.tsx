import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BookOpen, Stethoscope, CalendarCheck } from "lucide-react";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";

const BASE_URL = "https://bpr.clinic";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { slug: string };
}

async function getConditionPage(slug: string) {
  try {
    return await (prisma as any).conditionPage.findUnique({ where: { slug } });
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const page = await getConditionPage(params.slug);
  if (!page || !page.published) return { title: "Not Found" };

  const title = `${page.nameEn}${page.localIntent ? ` in ${page.localIntent}` : ""} | Bruno Physical Rehabilitation`;
  const description = page.metaDescriptionEn || page.summaryEn;

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/conditions/${page.slug}` },
    openGraph: { title, description, type: "website", url: `${BASE_URL}/conditions/${page.slug}` },
  };
}

export default async function ConditionPage({ params }: PageProps) {
  const page = await getConditionPage(params.slug);
  if (!page || !page.published) notFound();

  const [relatedArticle, relatedService] = await Promise.all([
    page.relatedArticleSlug
      ? prisma.article.findUnique({ where: { slug: page.relatedArticleSlug }, select: { slug: true, title: true, excerpt: true } })
      : null,
    page.relatedServiceSlug ? Promise.resolve({ slug: page.relatedServiceSlug }) : null,
  ]);

  const pageUrl = `${BASE_URL}/conditions/${page.slug}`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    "@id": pageUrl,
    url: pageUrl,
    name: page.nameEn,
    description: page.metaDescriptionEn || page.summaryEn,
    about: { "@type": "MedicalCondition", name: page.nameEn },
    ...(page.localIntent ? { contentLocation: { "@type": "Place", name: page.localIntent } } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <div className="bg-muted/30 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <span>/</span>
            <span className="text-foreground">{page.nameEn}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-3">
          <Stethoscope className="h-4 w-4" />
          {page.localIntent ? `${page.nameEn} in ${page.localIntent}` : page.nameEn}
        </div>
        <h1 className="font-sora text-3xl sm:text-4xl font-bold text-foreground mb-5 leading-tight tracking-tight">
          {page.nameEn}
        </h1>
        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">{page.summaryEn}</p>

        {page.contentEn && (
          <div
            className="prose prose-lg max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary mb-10"
            dangerouslySetInnerHTML={{ __html: page.contentEn }}
          />
        )}

        {/* Learn -> Treat -> Book bridge */}
        <div className="grid sm:grid-cols-3 gap-4 my-10">
          {relatedArticle && (
            <Link href={`/articles/${relatedArticle.slug}`} className="group border rounded-xl p-5 hover:border-primary/40 hover:bg-primary/5 transition-colors">
              <BookOpen className="h-5 w-5 text-primary mb-2" />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Learn</p>
              <p className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">{relatedArticle.title}</p>
            </Link>
          )}
          {relatedService && (
            <Link href={`/services/${relatedService.slug}`} className="group border rounded-xl p-5 hover:border-primary/40 hover:bg-primary/5 transition-colors">
              <Stethoscope className="h-5 w-5 text-primary mb-2" />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Treat</p>
              <p className="font-medium text-foreground group-hover:text-primary transition-colors">View treatment options</p>
            </Link>
          )}
          <Link href="/signup" className="group border rounded-xl p-5 bg-primary/10 border-primary/30 hover:bg-primary/15 transition-colors">
            <CalendarCheck className="h-5 w-5 text-primary mb-2" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Book</p>
            <p className="font-medium text-foreground flex items-center gap-1">
              Start your programme <ArrowRight className="h-3.5 w-3.5" />
            </p>
          </Link>
        </div>

        <MedicalDisclaimer />
      </div>
    </>
  );
}
