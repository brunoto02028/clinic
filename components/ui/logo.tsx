"use client";

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

  const lightSrc = logoUrl || null;
  const darkSrc = darkLogoUrl || null;
  const hasValidSrc = !!lightSrc || !!darkSrc;

  const content = (
    <div className={cn("inline-flex items-center flex-shrink-0", className)} style={{ height: h }}>
      {hasValidSrc ? (
        <>
          {variant === "auto" && lightSrc && darkSrc ? (
            <>
              <img
                src={lightSrc}
                alt="Logo"
                className="h-full w-auto object-contain block dark:hidden"
                loading={priority ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={priority ? "high" : "auto"}
              />
              <img
                src={darkSrc}
                alt="Logo"
                className="h-full w-auto object-contain hidden dark:block"
                loading={priority ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={priority ? "high" : "auto"}
              />
            </>
          ) : variant === "dark" && darkSrc ? (
            <img
              src={darkSrc}
              alt="Logo"
              className="h-full w-auto object-contain"
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={priority ? "high" : "auto"}
            />
          ) : lightSrc ? (
            <img
              src={lightSrc}
              alt="Logo"
              className="h-full w-auto object-contain"
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={priority ? "high" : "auto"}
            />
          ) : darkSrc ? (
            <img
              src={darkSrc}
              alt="Logo"
              className="h-full w-auto object-contain"
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={priority ? "high" : "auto"}
            />
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
