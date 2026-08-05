import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { BookOpen, Lock, ArrowRight } from "lucide-react";
import { getPublishedChapters, chapterTeaser, getBookReaderFromToken } from "@/lib/book";
import { BookCaptureForm } from "@/components/book-capture-form";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

// Table of contents — not indexed while the book is still being written;
// individual chapters stay gated behind email confirmation regardless.
export const metadata: Metadata = {
  title: "Chapters — Beyond Pain | Bruno Physical Rehabilitation",
  robots: { index: false, follow: false },
};

const ORDINALS = ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

export default async function BeyondPainChaptersPage() {
  const cookieStore = cookies();
  const reader = await getBookReaderFromToken(cookieStore.get("book_access")?.value);
  const chapters = await getPublishedChapters();

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
      <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-4 text-center">Beyond Pain</p>
      <h1 className="font-sora text-3xl sm:text-4xl font-bold text-foreground mb-4 text-center tracking-tight">
        Table of contents
      </h1>
      <p className="text-muted-foreground text-center mb-10 leading-relaxed max-w-lg mx-auto">
        Beyond Pain is being written now, chapter by chapter. Here's everything published so far — new chapters are
        added as they're finished, and subscribers get an email the moment each one lands.
      </p>

      {!reader && (
        <div className="mb-10">
          <BookCaptureForm />
        </div>
      )}

      <ol className="space-y-4">
        {chapters.length === 0 && (
          <li className="rounded-xl border border-border bg-card ba1-card p-6 text-center text-muted-foreground">
            The first chapter is being finished — check back very soon.
          </li>
        )}
        {chapters.map((chapter: any, i: number) => {
          const canRead = reader && chapter.isFree;
          const href = chapter.slug === "chapter-one" ? "/beyond-pain/chapter-one" : `/beyond-pain/chapters/${chapter.slug}`;
          const label = `Chapter ${ORDINALS[i] || i + 1}`;
          return (
            <li key={chapter.slug} className="rounded-xl border border-border bg-card ba1-card p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">{label}</p>
                  <h2 className="font-sora text-lg font-bold text-foreground mb-1.5">{chapter.titleEn}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{chapterTeaser(chapter.contentEn)}</p>
                </div>
                <div className="shrink-0 mt-1">
                  {canRead ? (
                    <BookOpen className="h-5 w-5 text-primary" />
                  ) : (
                    <Lock className="h-5 w-5 text-muted-foreground/50" />
                  )}
                </div>
              </div>
              <div className="mt-4">
                {canRead ? (
                  <Link href={href}>
                    <Button size="sm" variant="ba1Outline" className="gap-2">Read chapter <ArrowRight className="h-3.5 w-3.5" /></Button>
                  </Link>
                ) : (
                  <a href="#top">
                    <Button size="sm" variant="ba1Outline" className="gap-2" disabled>
                      Confirm your email above to unlock
                    </Button>
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-10 rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
        More chapters are on the way. Subscribers are the first to know — and the first to read.
      </div>

      <div className="text-center mt-10">
        <Link href="/beyond-pain" className="text-sm text-primary hover:underline">← Back to Beyond Pain</Link>
      </div>
    </div>
  );
}
