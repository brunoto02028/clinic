import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getBookReaderFromToken } from "@/lib/book";
import { BookCaptureForm } from "@/components/book-capture-form";
import { BookChapterReader } from "@/components/book-chapter-reader";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { Button } from "@/components/ui/button";

// Generic gated chapter reader for every chapter after Chapter One (which
// keeps its own dedicated /beyond-pain/chapter-one route — already linked
// from sent confirmation emails). Same server-side gate as chapter-one:
// the chapter HTML is only ever included in the render output for a request
// whose cookie resolves to a confirmed book contact.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const chapter = await (prisma as any).bookChapter.findUnique({ where: { slug } });
  return {
    title: `${chapter?.titleEn || "Chapter"} — Beyond Pain | Bruno Physical Rehabilitation`,
    robots: { index: false, follow: false },
  };
}

export default async function BeyondPainChapterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const chapter = await (prisma as any).bookChapter.findUnique({ where: { slug } });

  if (!chapter || !chapter.published) {
    notFound();
  }

  const cookieStore = cookies();
  const reader = await getBookReaderFromToken(cookieStore.get("book_access")?.value);
  const isPt = reader?.language === "pt";
  const chapterTitle = (isPt && chapter.titlePt) || chapter.titleEn;
  const chapterContent = (isPt && chapter.contentPt) || chapter.contentEn;

  if (!reader) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-4 text-center">Beyond Pain</p>
        <h1 className="font-sora text-3xl sm:text-4xl font-bold text-foreground mb-4 text-center tracking-tight">{chapter.titleEn}</h1>
        <p className="text-muted-foreground text-center mb-10 leading-relaxed">
          Confirm your email to read this chapter — it only takes a moment.
        </p>
        <BookCaptureForm />
        <div className="text-center mt-8">
          <Link href="/beyond-pain/chapters" className="text-sm text-primary hover:underline">← Back to all chapters</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
      <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-4 text-center">Beyond Pain</p>
      <h1 className="font-sora text-3xl sm:text-4xl font-bold text-foreground mb-10 text-center tracking-tight">{chapterTitle}</h1>

      <BookChapterReader html={chapterContent} readerEmail={reader.email} />

      <div className="mt-14 rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8 text-center">
        <p className="text-muted-foreground mb-4">Enjoyed this? Follow the journey as the rest of the book is written.</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/beyond-pain/chapters">
            <Button variant="ba1Outline" className="gap-2">All chapters</Button>
          </Link>
          <Link href="/signup">
            <Button variant="ba1Primary" className="gap-2">Book an assessment</Button>
          </Link>
        </div>
      </div>

      <MedicalDisclaimer />
    </div>
  );
}
