import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight, BookOpen } from "lucide-react";
import { getBookConfig, getBookReaderFromToken } from "@/lib/book";
import { BookCaptureForm } from "@/components/book-capture-form";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";

export const dynamic = "force-dynamic";

const BASE_URL = "https://bpr.rehab";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getBookConfig();
  const title = `${config.title} — ${config.subtitle} | Bruno Physical Rehabilitation`;
  const description = "Pain is rarely only physical. Read the first chapter of Beyond Pain, a new book on the science and soul of healing, free.";
  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/beyond-pain` },
    openGraph: { title, description, type: "website", url: `${BASE_URL}/beyond-pain` },
  };
}

export default async function BeyondPainPage() {
  const config = await getBookConfig();
  const cookieStore = cookies();
  const reader = await getBookReaderFromToken(cookieStore.get("book_access")?.value);

  const pageUrl = `${BASE_URL}/beyond-pain`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "Book",
    "@id": pageUrl,
    url: pageUrl,
    name: config.title,
    description: config.subtitle,
    author: { "@type": "Person", name: config.authorName || "Bruno" },
    workExample: { "@type": "Book", bookFormat: "https://schema.org/EBook" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        {/* Hero */}
        <div className="text-center mb-14">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-4">A new book · coming soon</p>
          <h1 className="font-sora text-4xl sm:text-5xl font-bold text-foreground mb-4 tracking-tight">{config.title}</h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-6">{config.subtitle}</p>
          <p className="text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Most of us are taught that pain lives in the body. The truth is bigger — and far more hopeful.
          </p>
        </div>

        {/* What the book is about */}
        <section className="mb-14">
          <h2 className="font-sora text-xl font-bold text-foreground mb-3">What the book is about</h2>
          <p className="text-muted-foreground leading-relaxed">
            Pain is rarely only physical. It speaks the language of the body, the mind and the spirit — and lasting healing has to meet all three. Drawing on the science of how pain really works, alongside a faith that takes the whole person seriously, <em>{config.title}</em> is a guide out of suffering and into wholeness. It is being written now, chapter by chapter — and you can follow the journey from the start.
          </p>
        </section>

        {/* About the author */}
        <section className="mb-14 rounded-2xl border border-border bg-muted/20 p-6 sm:p-8">
          <h2 className="font-sora text-xl font-bold text-foreground mb-3">About the author</h2>
          <p className="text-muted-foreground leading-relaxed">
            {config.authorBio ||
              `Written by ${config.authorName || "Bruno"}, a sports and clinical therapist in Ipswich and a former professional footballer who came back from three knee surgeries. "My purpose is simple: to treat every person the way I wish I'd been treated during my own recovery — with real attention, not just protocol."`}
          </p>
        </section>

        {/* Join / buy block — launch switch */}
        <section className="mb-14">
          {config.status === "ON_SALE" ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8 text-center">
              <BookOpen className="h-10 w-10 text-primary mx-auto mb-3" />
              <h2 className="font-sora text-xl font-bold text-foreground mb-2">{config.title} is available now</h2>
              {config.priceDisplay && <p className="text-muted-foreground mb-5">{config.priceDisplay}</p>}
              <div className="flex flex-wrap gap-3 justify-center">
                {config.buyLinkDirect && (
                  <a href={config.buyLinkDirect} className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors">
                    Buy direct <ArrowRight className="h-4 w-4" />
                  </a>
                )}
                {config.buyLinkAmazon && (
                  <a href={config.buyLinkAmazon} className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold hover:border-primary/40 transition-colors">
                    Buy on Amazon
                  </a>
                )}
              </div>
            </div>
          ) : reader ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8 text-center">
              <BookOpen className="h-10 w-10 text-primary mx-auto mb-3" />
              <h2 className="font-sora text-lg font-bold text-foreground mb-2">Welcome back</h2>
              <p className="text-sm text-muted-foreground mb-5">You've already confirmed your email — jump straight back in.</p>
              <Link href="/beyond-pain/chapter-one" className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors">
                Continue reading <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <>
              <h2 className="font-sora text-xl font-bold text-foreground mb-2 text-center">
                {config.status === "WAITLIST" ? "Join the waitlist for launch-day pricing" : "Read Chapter One free — and follow the book as it's written"}
              </h2>
              <p className="text-muted-foreground text-center mb-6 max-w-xl mx-auto">
                Join the list to read the opening chapter today, get behind-the-scenes insights as each chapter is written, and be first to know when the book launches — with a special early-reader price.
              </p>
              <BookCaptureForm />
            </>
          )}
        </section>

        <div className="text-center mb-10">
          <Link href="/articles" className="text-sm text-primary hover:underline">
            ← Back to the study centre
          </Link>
        </div>

        <MedicalDisclaimer />
      </div>
    </>
  );
}
