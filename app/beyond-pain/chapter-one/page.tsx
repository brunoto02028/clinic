import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getBookConfig, getBookReaderFromToken, resolveReferrerContact } from "@/lib/book";
import { BookCaptureForm } from "@/components/book-capture-form";
import { BookReferForm } from "@/components/book-refer-form";
import { BookChapterReader } from "@/components/book-chapter-reader";
import { Book3DCover } from "@/components/book-3d-cover";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

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

export default async function ChapterOnePage({
  searchParams,
}: {
  searchParams: { refFrom?: string; ref?: string };
}) {
  const config = await getBookConfig();
  const cookieStore = cookies();
  const reader = await getBookReaderFromToken(cookieStore.get("book_access")?.value);
  const refFrom = searchParams?.refFrom;
  const referralId = searchParams?.ref;

  if (!reader) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <div className="w-[110px] sm:w-[130px] mx-auto mb-8">
          <Book3DCover coverImage={config.coverImage} coverImagePt={config.coverImagePt} title={config.title} />
        </div>
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-4 text-center">Beyond Pain · Chapter One</p>
        <h1 className="font-sora text-3xl sm:text-4xl font-bold text-foreground mb-4 text-center tracking-tight">Pain From the Inside</h1>
        <p className="text-muted-foreground text-center mb-10 leading-relaxed">
          Two workmen. Two nails. Two opposite fates — and, between them, a lesson that turns almost everything we think we know about pain inside out. Confirm your email to read the full chapter.
        </p>
        <BookCaptureForm referralId={referralId} />
        <div className="text-center mt-8">
          <Link href="/beyond-pain" className="text-sm text-primary hover:underline">← Back to Beyond Pain</Link>
        </div>
      </div>
    );
  }

  const referrerContact = await resolveReferrerContact(refFrom);
  const verifiedRefFrom = referrerContact ? refFrom : undefined;

  const chapter = await (prisma as any).bookChapter.findUnique({ where: { slug: "chapter-one" } });

  if (!chapter || !chapter.published) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <p className="text-muted-foreground">This chapter isn't available yet — check back soon.</p>
      </div>
    );
  }

  const isPt = reader.language === "pt";
  const pdfUrl = `/api/beyond-pain/download?lang=${isPt ? "pt" : "en"}`;
  const chapterTitle = (isPt && chapter.titlePt) || chapter.titleEn;
  const chapterContent = (isPt && chapter.contentPt) || chapter.contentEn;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
      <div className="w-[90px] mx-auto mb-6">
        <Book3DCover coverImage={config.coverImage} coverImagePt={config.coverImagePt} title={config.title} />
      </div>
      <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-4 text-center">Beyond Pain · Chapter One</p>
      <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 mb-8 text-center">
        <p className="text-sm text-foreground">
          You're in. Here's Chapter One — enjoy it, and I'll be in touch as the next chapter lands.
        </p>
      </div>
      <h1 className="font-sora text-3xl sm:text-4xl font-bold text-foreground mb-6 text-center tracking-tight">{chapterTitle}</h1>

      <div className="text-center mb-10">
        <a href={pdfUrl} download>
          <Button variant="ba1Outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" /> Download as PDF
          </Button>
        </a>
      </div>

      <BookChapterReader html={chapterContent} readerEmail={reader.email} />

      <div className="mt-14 rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8 text-center">
        <p className="text-muted-foreground mb-4">Enjoyed this? Follow the journey as the rest of the book is written.</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <a href={pdfUrl} download>
            <Button variant="ba1Outline" className="gap-2">
              <Download className="h-4 w-4" /> Download PDF
            </Button>
          </a>
          <Link href="/beyond-pain/chapters">
            <Button variant="ba1Outline" className="gap-2">All chapters</Button>
          </Link>
          <Link href="/signup">
            <Button variant="ba1Primary" className="gap-2">Book an assessment</Button>
          </Link>
        </div>
        <p className="text-[11px] text-muted-foreground/70 mt-6 leading-relaxed">
          This chapter is copyright-protected — an excerpt from the forthcoming book <em>Beyond Pain</em>, shared with you for personal reading only. Please don't copy, resell or redistribute it, even as a single chapter.
        </p>
      </div>

      <div className="mt-8">
        <BookReferForm referrerContactId={verifiedRefFrom} referrerName={referrerContact?.firstName || undefined} />
      </div>

      <MedicalDisclaimer />
    </div>
  );
}
