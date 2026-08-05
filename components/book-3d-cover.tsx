"use client";

import { BookOpen } from "lucide-react";

/**
 * Realistic 3D book mockup — pure CSS 3D transforms (no image assets beyond
 * the cover art itself). Renders the front cover at a slight angle with a
 * visible spine and page edges, used on /beyond-pain in place of a flat
 * cover image.
 */
export function Book3DCover({
  coverImage,
  title,
  className = "",
}: {
  coverImage: string | null;
  title: string;
  className?: string;
}) {
  const depth = 26; // px — spine/page thickness

  return (
    <div
      className={`relative mx-auto w-full ${className}`}
      style={{ perspective: "1800px" }}
    >
      <div
        className="relative aspect-[2/3] mx-auto transition-transform duration-700 ease-out will-change-transform hover:[transform:rotateY(-14deg)_rotateX(1deg)]"
        style={{
          transformStyle: "preserve-3d",
          transform: "rotateY(-26deg) rotateX(2deg)",
          maxWidth: "80%",
        }}
      >
        {/* Front cover */}
        <div
          className="absolute inset-0 overflow-hidden rounded-r-md rounded-l-[2px] border border-black/10"
          style={{
            transform: `translateZ(${depth}px)`,
            backfaceVisibility: "hidden",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.45)",
          }}
        >
          {coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverImage}
              alt={`${title} — book cover`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#EDF3EF] to-[#E4E3DF] p-6">
              <div className="text-center text-muted-foreground/60">
                <BookOpen className="mx-auto mb-3 h-14 w-14" />
                <p className="text-sm font-medium">{title}</p>
                <p className="mt-1 text-xs">Cover coming soon</p>
              </div>
            </div>
          )}
          {/* Gloss / light sheen */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-black/15" />
        </div>

        {/* Spine (left edge) */}
        <div
          className="absolute left-0 top-0 h-full"
          style={{
            width: depth,
            transformOrigin: "left",
            transform: "rotateY(-90deg)",
            background: "linear-gradient(to right, #1c2621, #2f3d34 55%, #1c2621)",
            boxShadow: "inset -2px 0 4px rgba(0,0,0,0.4)",
          }}
        />

        {/* Page edges (right side) */}
        <div
          className="absolute right-0 top-0 h-full"
          style={{
            width: depth,
            transformOrigin: "right",
            transform: "rotateY(90deg)",
            background:
              "repeating-linear-gradient(to bottom, #f7f5ef 0px, #f7f5ef 2px, #e6e2d8 2.5px, #f7f5ef 3px)",
            boxShadow: "inset 2px 0 6px rgba(0,0,0,0.15)",
          }}
        />
      </div>

      {/* Contact shadow on the ground */}
      <div
        className="absolute left-1/2 h-6 w-[70%] -translate-x-1/2 rounded-full bg-black/25 blur-xl"
        style={{ bottom: "-1.25rem" }}
      />
    </div>
  );
}
