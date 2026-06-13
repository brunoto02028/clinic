"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  linkTo?: string;
  logoUrl?: string | null;
  darkLogoUrl?: string | null;
  variant?: "light" | "dark" | "auto";
  priority?: boolean;
  siteName?: string;
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
  priority = false,
  siteName = "BPR",
}: LogoProps) {
  const h = SIZE_PX[size] || 40;
  const [imgError, setImgError] = useState(false);

  // Decide which image(s) to render
  const lightSrc = logoUrl || null;
  const darkSrc = darkLogoUrl || null;
  const hasValidSrc = (lightSrc || darkSrc) && !imgError;

  const content = (
    <div className={cn("inline-flex items-center flex-shrink-0", className)} style={{ height: h }}>
      {hasValidSrc ? (
        <>
          {variant === "auto" && lightSrc && darkSrc ? (
            <>
              <div className="relative block dark:hidden" style={{ height: h, width: h * 2.5 }}>
                <Image
                  src={lightSrc}
                  alt="Logo"
                  fill
                  className="object-contain"
                  priority={priority}
                  quality={100}
                  sizes={`${h * 2.5}px`}
                  onError={() => setImgError(true)}
                />
              </div>
              <div className="relative hidden dark:block" style={{ height: h, width: h * 2.5 }}>
                <Image
                  src={darkSrc}
                  alt="Logo"
                  fill
                  className="object-contain"
                  priority={priority}
                  quality={100}
                  sizes={`${h * 2.5}px`}
                  onError={() => setImgError(true)}
                />
              </div>
            </>
          ) : variant === "dark" && darkSrc ? (
            <div className="relative" style={{ height: h, width: h * 2.5 }}>
              <Image
                src={darkSrc}
                alt="Logo"
                fill
                className="object-contain"
                priority={priority}
                quality={100}
                sizes={`${h * 2.5}px`}
                onError={() => setImgError(true)}
              />
            </div>
          ) : lightSrc ? (
            <div className="relative" style={{ height: h, width: h * 2.5 }}>
              <Image
                src={lightSrc}
                alt="Logo"
                fill
                className="object-contain"
                priority={priority}
                quality={100}
                sizes={`${h * 2.5}px`}
                onError={() => setImgError(true)}
              />
            </div>
          ) : darkSrc ? (
            <div className="relative" style={{ height: h, width: h * 2.5 }}>
              <Image
                src={darkSrc}
                alt="Logo"
                fill
                className="object-contain"
                priority={priority}
                quality={100}
                sizes={`${h * 2.5}px`}
                onError={() => setImgError(true)}
              />
            </div>
          ) : null}
        </>
      ) : (
        <span
          className="font-bold tracking-tight text-foreground whitespace-nowrap"
          style={{ fontSize: h * 0.55, lineHeight: 1 }}
        >
          {siteName}
        </span>
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
