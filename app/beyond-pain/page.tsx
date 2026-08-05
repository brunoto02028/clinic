import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight, BookOpen, Sparkles, HeartHandshake } from "lucide-react";
import { getBookConfig, getBookReaderFromToken } from "@/lib/book";
import { BookCaptureForm } from "@/components/book-capture-form";
import { Book3DCover } from "@/components/book-3d-cover";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { Button } from "@/components/ui/button";

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

      {/* Hero */}
      <section className="relative overflow-hidden bg-dot-pattern">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-20 pb-16 sm:pb-24">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Text */}
            <div>
              <span className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wider mb-5">
                <Sparkles className="h-3.5 w-3.5" />A new book · coming soon
              </span>
              <h1 className="font-sora text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight tracking-tight mb-5">
                {config.title}
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground mb-4">{config.subtitle}</p>
              <p className="text-base text-muted-foreground leading-relaxed max-w-lg">
                Most of us are taught that pain lives in the body. The truth is bigger — and far more hopeful.
              </p>
              {!reader && config.status !== "ON_SALE" && (
                <div className="mt-8">
                  <a href="#join">
                    <Button size="lg" variant="ba1Primary" className="gap-2">
                      Read the first chapter free <ArrowRight className="h-5 w-5" />
                    </Button>
                  </a>
                </div>
              )}
            </div>

            {/* Cover — 3D book mockup */}
            <div className="relative mx-auto w-full max-w-xs lg:max-w-sm pb-6">
              <Book3DCover coverImage={config.coverImage} title={config.title} />
              <div className="hidden sm:block absolute -bottom-1 -left-5 bg-white rounded-2xl p-4 shadow-xl border border-border ba1-card">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center"><HeartHandshake className="h-5 w-5 text-primary" /></div>
                  <div>
                    <p className="text-sm font-bold text-foreground leading-tight">Body, soul & spirit</p>
                    <p className="text-xs text-muted-foreground">A whole-person guide to healing</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        {/* What the book is about */}
        <section className="mb-14">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
            What it's about
          </span>
          <h2 className="font-sora text-2xl sm:text-3xl font-bold text-foreground mb-4 tracking-tight">A guide out of suffering and into wholeness</h2>
          <p className="text-muted-foreground leading-relaxed text-base sm:text-lg">
            Pain is rarely only physical. It speaks the language of the body, the mind and the spirit — and lasting healing has to meet all three. Drawing on the science of how pain really works, alongside a faith that takes the whole person seriously, <em>{config.title}</em> is being written now, chapter by chapter — and you can follow the journey from the start.
          </p>
        </section>

        {/* About the author */}
        <section className="mb-14 rounded-2xl border border-border bg-card ba1-card p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-gradient-to-br from-[#EDF3EF] to-[#E4E3DF] border border-border shrink-0 flex items-center justify-center">
              {config.authorPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={config.authorPhoto} alt={config.authorName || "Author"} className="object-cover w-full h-full" />
              ) : (
                <span className="font-sora text-2xl font-bold text-primary">{(config.authorName || "B").charAt(0)}</span>
              )}
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
                About the author
              </span>
              <p className="text-muted-foreground leading-relaxed">
                {config.authorBio ||
                  `Written by ${config.authorName || "Bruno"}, a sports and clinical therapist in Ipswich and a former professional footballer who came back from three knee surgeries. "My purpose is simple: to treat every person the way I wish I'd been treated during my own recovery — with real attention, not just protocol."`}
              </p>
            </div>
          </div>
        </section>

        {/* Join / buy block — launch switch */}
        <section id="join" className="mb-14 scroll-mt-24">
          {config.status === "ON_SALE" ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-10 text-center">
              <BookOpen className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="font-sora text-2xl font-bold text-foreground mb-2">{config.title} is available now</h2>
              {config.priceDisplay && <p className="text-muted-foreground mb-6">{config.priceDisplay}</p>}
              <div className="flex flex-wrap gap-3 justify-center">
                {config.buyLinkDirect && (
                  <a href={config.buyLinkDirect}>
                    <Button size="lg" variant="ba1Primary" className="gap-2">Buy direct <ArrowRight className="h-4 w-4" /></Button>
                  </a>
                )}
                {config.buyLinkAmazon && (
                  <a href={config.buyLinkAmazon}>
                    <Button size="lg" variant="ba1Outline">Buy on Amazon</Button>
                  </a>
                )}
              </div>
            </div>
          ) : reader ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-10 text-center">
              <BookOpen className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="font-sora text-xl font-bold text-foreground mb-2">Welcome back</h2>
              <p className="text-sm text-muted-foreground mb-6">You've already confirmed your email — jump straight back in.</p>
              <Link href="/beyond-pain/chapter-one">
                <Button size="lg" variant="ba1Primary" className="gap-2">Continue reading <ArrowRight className="h-4 w-4" /></Button>
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card ba1-card p-6 sm:p-10">
              <h2 className="font-sora text-2xl font-bold text-foreground mb-2 text-center">
                {config.status === "WAITLIST" ? "Join the waitlist for launch-day pricing" : "Read Chapter One free — and follow the book as it's written"}
              </h2>
              <p className="text-muted-foreground text-center mb-8 max-w-xl mx-auto">
                Join the list to read the opening chapter today, get behind-the-scenes insights as each chapter is written, and be first to know when the book launches — with a special early-reader price.
              </p>
              <BookCaptureForm compact />
            </div>
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
