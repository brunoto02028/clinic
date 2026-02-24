"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  linkTo?: string;
  logoUrl?: string | null;
  darkLogoUrl?: string | null;
  variant?: "light" | "dark" | "auto";
}

// Fixed pixel heights for each size — no ambiguity
const SIZE_PX: Record<string, number> = { sm: 32, md: 40, lg: 48, xl: 64 };

export function Logo({
  className,
  size = "md",
  // showText kept for backwards compat but ignored
  showText: _showText,
  linkTo = "/",
  logoUrl,
  darkLogoUrl,
  variant = "auto",
}: LogoProps) {
  const h = SIZE_PX[size] || 40;
  const [imgError, setImgError] = useState(false);

  // Decide which image(s) to render
  const lightSrc = logoUrl || null;
  const darkSrc = darkLogoUrl || null;
  const hasValidSrc = (lightSrc || darkSrc) && !imgError;

  const content = (
    <div className={cn("inline-flex items-center flex-shrink-0", className)}>
      {hasValidSrc ? (
        <>
          {variant === "auto" && lightSrc && darkSrc ? (
            <>
              <img
                src={lightSrc}
                alt="Logo"
                style={{ height: h, width: "auto" }}
                className="block dark:hidden object-contain"
                onError={() => setImgError(true)}
              />
              <img
                src={darkSrc}
                alt="Logo"
                style={{ height: h, width: "auto" }}
                className="hidden dark:block object-contain"
                onError={() => setImgError(true)}
              />
            </>
          ) : variant === "dark" && darkSrc ? (
            <img
              src={darkSrc}
              alt="Logo"
              style={{ height: h, width: "auto" }}
              className="block object-contain"
              onError={() => setImgError(true)}
            />
          ) : lightSrc ? (
            <img
              src={lightSrc}
              alt="Logo"
              style={{ height: h, width: "auto" }}
              className="block object-contain"
              onError={() => setImgError(true)}
            />
          ) : darkSrc ? (
            <img
              src={darkSrc}
              alt="Logo"
              style={{ height: h, width: "auto" }}
              className="block object-contain"
              onError={() => setImgError(true)}
            />
          ) : null}
        </>
      ) : (
        <svg
          width={h * 2.5}
          height={h}
          viewBox="0 0 250 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <text x="0" y="76" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="80" letterSpacing="-2" fill="hsl(var(--primary))">BPR</text>
          <text x="175" y="76" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="80" letterSpacing="-2" fill="hsl(var(--secondary))">.</text>
        </svg>
      )}
    </div>
  );

  if (linkTo) {
    return (
      <Link href={linkTo} className="hover:opacity-90 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}

export default Logo;
