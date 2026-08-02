import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";

/** Discreet book CTA shown at the foot of qualifying articles (§3 of
 *  BPR_Devin_Spec_Beyond_Pain_Book.md) — see lib/book-cta-config.ts for
 *  which article tags trigger it. */
export function BookCta() {
  return (
    <Link
      href="/beyond-pain"
      className="my-8 flex items-center gap-4 rounded-2xl border border-border bg-muted/20 p-5 hover:border-primary/40 hover:bg-primary/5 transition-colors group"
    >
      <div className="hidden sm:flex h-11 w-11 rounded-xl bg-primary/15 items-center justify-center flex-shrink-0">
        <BookOpen className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-muted-foreground">
          This is part of a bigger story. Read the first chapter of{" "}
          <span className="font-semibold text-foreground">Beyond Pain</span>, free.
        </p>
      </div>
      <ArrowRight className="h-4 w-4 text-primary shrink-0 group-hover:translate-x-0.5 transition-transform" />
    </Link>
  );
}
