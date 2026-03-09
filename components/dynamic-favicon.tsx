"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

export function DynamicFavicon() {
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data?.faviconUrl) setFaviconUrl(data.faviconUrl);
      })
      .catch(() => {});
  }, []);

  // Use React portal to render into <head> without direct DOM manipulation
  if (!mounted || !faviconUrl) return null;

  return createPortal(
    <>
      <link rel="icon" href={faviconUrl} />
      <link rel="shortcut icon" href={faviconUrl} />
      <link rel="apple-touch-icon" href={faviconUrl} />
    </>,
    document.head
  );
}
