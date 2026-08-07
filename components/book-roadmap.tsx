"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, Lock } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { BOOK_ROADMAP } from "@/lib/book-roadmap";

/**
 * Full 12-chapter "In This Book" roadmap for Beyond Pain — bilingual
 * (EN primary, PT translation), grouped by part. Only Chapter One is
 * actually written and readable today; every other chapter is shown as
 * "Coming soon" to build curiosity for readers who've received the free
 * Chapter One PDF. See lib/book-roadmap.ts for the source content.
 */
export function BookRoadmap({ canReadChapterOne }: { canReadChapterOne: boolean }) {
  const { locale } = useLocale();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isPt = mounted && locale.startsWith("pt");

  return (
    <div className="space-y-8">
      {BOOK_ROADMAP.map((part) => (
        <div key={part.partEn}>
          <h3 className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
            {isPt ? part.partPt : part.partEn}
          </h3>
          <ol className="space-y-3">
            {part.chapters.map((chapter) => {
              const isChapterOne = chapter.slug === "chapter-one";
              const canRead = isChapterOne && canReadChapterOne;
              return (
                <li
                  key={chapter.number}
                  className="rounded-xl border border-border bg-card ba1-card p-4 sm:p-5 flex items-start gap-3"
                >
                  <div className="shrink-0 mt-0.5">
                    {canRead ? (
                      <BookOpen className="h-4.5 w-4.5 text-primary" />
                    ) : (
                      <Lock className="h-4.5 w-4.5 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground mb-0.5">
                      {isPt ? "Capítulo" : "Chapter"} {chapter.number}
                    </p>
                    <h4 className="font-sora text-base font-bold text-foreground mb-1">
                      {isPt ? chapter.titlePt : chapter.titleEn}
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {isPt ? chapter.teaserPt : chapter.teaserEn}
                    </p>
                    {isChapterOne && (
                      <div className="mt-2">
                        {canRead ? (
                          <Link href="/beyond-pain/chapter-one" className="text-xs font-semibold text-primary hover:underline">
                            {isPt ? "Ler agora →" : "Read now →"}
                          </Link>
                        ) : (
                          <span className="text-xs font-semibold text-muted-foreground/70">
                            {isPt ? "Grátis — confirme o seu email acima" : "Free — confirm your email above"}
                          </span>
                        )}
                      </div>
                    )}
                    {!isChapterOne && (
                      <span className="inline-block mt-2 text-xs font-semibold text-muted-foreground/60">
                        {isPt ? "Em breve" : "Coming soon"}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}
