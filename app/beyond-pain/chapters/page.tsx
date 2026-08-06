import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { Sparkles } from "lucide-react";
import { getBookConfig, getBookReaderFromToken } from "@/lib/book";
import { BookCaptureForm } from "@/components/book-capture-form";
import { BookRoadmap } from "@/components/book-roadmap";
import { Book3DCover } from "@/components/book-3d-cover";
import { LocalizedText } from "@/app/articles/[slug]/localized";

export const dynamic = "force-dynamic";

// Table of contents — not indexed while the book is still being written;
// individual chapters stay gated behind email confirmation regardless.
export const metadata: Metadata = {
  title: "Chapters — Beyond Pain | Bruno Physical Rehabilitation",
  robots: { index: false, follow: false },
};

export default async function BeyondPainChaptersPage() {
  const config = await getBookConfig();
  const cookieStore = cookies();
  const reader = await getBookReaderFromToken(cookieStore.get("book_access")?.value);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
      <div className="w-[110px] sm:w-[130px] mx-auto mb-8">
        <Book3DCover coverImage={config.coverImage} title={config.title} />
      </div>
      <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-4 text-center">Beyond Pain</p>
      <div className="flex justify-center mb-4">
        <span className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wider">
          <Sparkles className="h-3.5 w-3.5" /><LocalizedText fallback="Book coming soon" en="Book coming soon" pt="Livro em breve" />
        </span>
      </div>
      <h1 className="font-sora text-3xl sm:text-4xl font-bold text-foreground mb-4 text-center tracking-tight">
        <LocalizedText fallback="Table of contents" en="Table of contents" pt="Índice de capítulos" />
      </h1>
      <p className="text-muted-foreground text-center mb-10 leading-relaxed max-w-lg mx-auto">
        <LocalizedText
          as="span"
          fallback="Beyond Pain hasn't launched yet — it's being written now, chapter by chapter. Here's everything published so far — new chapters are added as they're finished, and subscribers get an email the moment each one lands, plus the first news when the full book launches."
          en="Beyond Pain hasn't launched yet — it's being written now, chapter by chapter. Here's everything published so far — new chapters are added as they're finished, and subscribers get an email the moment each one lands, plus the first news when the full book launches."
          pt="Além da Dor ainda não foi lançado — está sendo escrito agora, capítulo por capítulo. Aqui está tudo o que já foi publicado — novos capítulos são adicionados à medida que ficam prontos, e os inscritos recebem um email no momento em que cada um chega, além de serem os primeiros a saber quando o livro completo for lançado."
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
          fallback="The full book hasn't launched yet — more chapters are on the way, and subscribers are the first to know when it does."
          en="The full book hasn't launched yet — more chapters are on the way, and subscribers are the first to know when it does."
          pt="O livro completo ainda não foi lançado — mais capítulos estão a caminho, e os inscritos são os primeiros a saber quando ele for lançado."
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
