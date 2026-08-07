import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getBookReaderFromToken } from "@/lib/book";
import { BookCaptureForm } from "@/components/book-capture-form";
import { BookChapterReader } from "@/components/book-chapter-reader";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { Button } from "@/components/ui/button";

// Gated HTML chapter reader (§2 of BPR_Devin_Spec_Beyond_Pain_Book.md).
// Server-side gate — the chapter body is only ever included in the render
// output for a request whose cookie resolves to a confirmed book contact;
// unconfirmed visitors never receive the chapter HTML in the payload.
export const dynamic = "force-dynamic";

// Gated content — not indexed by Google.
export const metadata: Metadata = {
  title: "Chapter One — Beyond Pain | Bruno Physical Rehabilitation",
  robots: { index: false, follow: false },
};

export default async function ChapterOnePage() {
  const cookieStore = cookies();
  const reader = await getBookReaderFromToken(cookieStore.get("book_access")?.value);

  if (!reader) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-4 text-center">Beyond Pain · Chapter One</p>
        <h1 className="font-sora text-3xl sm:text-4xl font-bold text-foreground mb-4 text-center tracking-tight">Pain From the Inside</h1>
        <p className="text-muted-foreground text-center mb-10 leading-relaxed">
          Two workmen. Two nails. Two opposite fates — and, between them, a lesson that turns almost everything we think we know about pain on its head. Confirm your email to read the full chapter.
        </p>
        <BookCaptureForm />
        <div className="text-center mt-8">
          <Link href="/beyond-pain" className="text-sm text-primary hover:underline">← Back to Beyond Pain</Link>
        </div>
      </div>
    );
  }

  const chapter = await (prisma as any).bookChapter.findUnique({ where: { slug: "chapter-one" } });

  if (!chapter || !chapter.published) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <p className="text-muted-foreground">This chapter isn't available yet — check back soon.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
      <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-4 text-center">Beyond Pain · Chapter One</p>
      <h1 className="font-sora text-3xl sm:text-4xl font-bold text-foreground mb-10 text-center tracking-tight">{chapter.titleEn}</h1>

      <BookChapterReader html={chapter.contentEn} readerEmail={reader.email} />

      <div className="mt-14 rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8 text-center">
        <p className="text-muted-foreground mb-4">Enjoyed this? Follow the journey as the rest of the book is written.</p>
        <Link href="/signup">
          <Button variant="ba1Primary" className="gap-2">Book an assessment</Button>
        </Link>
      </div>

      <MedicalDisclaimer />
    </div>
  );
}
