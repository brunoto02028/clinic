import Link from "next/link";
import { Metadata } from "next";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Services | BPR Physical Rehabilitation",
  description:
    "Physical rehabilitation, laser therapy, electrotherapy and recovery services in Ipswich, Suffolk.",
  alternates: { canonical: "https://bpr.clinic/services" },
};

/**
 * /services used to 404: every service had its own page, but the bare path —
 * the one a person types, and the one search engines treat as the section
 * root — led nowhere. A plain index over the same rows the header menu uses.
 */
export default async function ServicesIndexPage() {
  const pages = await (prisma as any).servicePage.findMany({
    where: { published: true },
    select: {
      slug: true,
      titleEn: true,
      descriptionEn: true,
    },
    orderBy: { titleEn: "asc" },
  });

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-16">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Our Services</h1>
        <p className="mt-3 text-muted-foreground max-w-2xl">
          Evidence-based rehabilitation and recovery care in Ipswich — in clinic and at home.
        </p>

        <div className="mt-10 grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {pages.map((p: any) => (
            <Link
              key={p.slug}
              href={`/services/${p.slug}`}
              className="group rounded-xl border bg-card p-5 transition-all hover:shadow-lg hover:border-primary/40"
            >
              <h2 className="font-semibold group-hover:text-primary transition-colors">
                {p.titleEn}
              </h2>
              {p.descriptionEn && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                  {p.descriptionEn}
                </p>
              )}
            </Link>
          ))}
        </div>

        {pages.length === 0 && (
          <p className="mt-10 text-muted-foreground">
            Our service pages are being prepared — please check back soon.
          </p>
        )}
      </div>
    </main>
  );
}
