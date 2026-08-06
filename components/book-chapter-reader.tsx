"use client";

import { useEffect, useRef } from "react";

/**
 * Renders gated book chapter content with light copy-deterrence (§2.3 of
 * BPR_Devin_Spec_Beyond_Pain_Book.md): a faint per-reader watermark (email
 * stamped into the page) plus disabled right-click/selection. None of this
 * fully prevents copying — it's meant to deter casual copying and make any
 * leak traceable, not to be a real DRM layer.
 */
export function BookChapterReader({ html, readerEmail }: { html: string; readerEmail: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const block = (e: Event) => e.preventDefault();
    el.addEventListener("contextmenu", block);
    el.addEventListener("copy", block);
    return () => {
      el.removeEventListener("contextmenu", block);
      el.removeEventListener("copy", block);
    };
  }, []);

  return (
    <div className="relative">
      {/* Repeating watermark — faint, diagonal, tied to the reader's email */}
      <div
        aria-hidden
        className="pointer-events-none select-none absolute inset-0 z-10 overflow-hidden opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
            `<svg xmlns='http://www.w3.org/2000/svg' width='420' height='220'><text x='0' y='120' font-size='18' fill='black' transform='rotate(-28 210 110)' font-family='sans-serif'>${readerEmail}</text></svg>`
          )}")`,
          backgroundRepeat: "repeat",
        }}
      />
      <div
        ref={ref}
        className="book-content relative select-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <p className="relative mt-8 text-center text-[11px] text-muted-foreground/70">
        Licensed to {readerEmail} — please don't share.
      </p>
    </div>
  );
}
