import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { getBookReaderFromToken } from "@/lib/book";
import { BookCaptureForm } from "@/components/book-capture-form";
import { BookRoadmap } from "@/components/book-roadmap";
import { LocalizedText } from "@/app/articles/[slug]/localized";

export const dynamic = "force-dynamic";

// Table of contents — not indexed while the book is still being written;
// individual chapters stay gated behind email confirmation regardless.
export const metadata: Metadata = {
  title: "Chapters — Beyond Pain | Bruno Physical Rehabilitation",
  robots: { index: false, follow: false },
};

export default async function BeyondPainChaptersPage() {
  const cookieStore = cookies();
  const reader = await getBookReaderFromToken(cookieStore.get("book_access")?.value);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
      <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-4 text-center">Beyond Pain</p>
      <h1 className="font-sora text-3xl sm:text-4xl font-bold text-foreground mb-4 text-center tracking-tight">
        <LocalizedText fallback="Table of contents" en="Table of contents" pt="Índice de capítulos" />
      </h1>
      <p className="text-muted-foreground text-center mb-10 leading-relaxed max-w-lg mx-auto">
        <LocalizedText
          as="span"
          fallback="Beyond Pain is being written now, chapter by chapter. Here's everything published so far — new chapters are added as they're finished, and subscribers get an email the moment each one lands."
          en="Beyond Pain is being written now, chapter by chapter. Here's everything published so far — new chapters are added as they're finished, and subscribers get an email the moment each one lands."
          pt="Além da Dor está sendo escrito agora, capítulo por capítulo. Aqui está tudo o que já foi publicado — novos capítulos são adicionados à medida que ficam prontos, e os inscritos recebem um email no momento em que cada um chega."
        />
      </p>

      {!reader && (
        <div className="mb-10">
          <BookCaptureForm />
        </div>
      )}

      <h2 className="font-sora text-lg font-bold text-foreground mb-1 text-center">
        <LocalizedText fallback="In this book" en="In this book" pt="Neste livro" />
      </h2>
      <p className="text-sm text-muted-foreground text-center mb-6 max-w-md mx-auto">
        <LocalizedText
          fallback="The full roadmap, 12 chapters across four parts. Chapter One is free today — the rest is on its way."
          en="The full roadmap, 12 chapters across four parts. Chapter One is free today — the rest is on its way."
          pt="O roteiro completo, 12 capítulos em quatro partes. O Capítulo Um é grátis hoje — o resto está a caminho."
        />
      </p>

      <BookRoadmap canReadChapterOne={!!reader} />

      <div className="mt-10 rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
        <LocalizedText
          fallback="More chapters are on the way. Subscribers are the first to know — and the first to read."
          en="More chapters are on the way. Subscribers are the first to know — and the first to read."
          pt="Mais capítulos estão a caminho. Os inscritos são os primeiros a saber — e os primeiros a ler."
        />
      </div>

      <div className="text-center mt-10">
        <Link href="/beyond-pain" className="text-sm text-primary hover:underline">
          <LocalizedText fallback="← Back to Beyond Pain" en="← Back to Beyond Pain" pt="← Voltar para Além da Dor" />
        </Link>
      </div>
    </div>
  );
}
