"use client";

import { useEffect } from "react";

export function DynamicFavicon() {
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const url = data?.faviconUrl;
        if (!url) return;
        // Remove existing favicon links
        document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').forEach((el) => el.remove());
        // Add new favicon
        const link = document.createElement("link");
        link.rel = "icon";
        link.href = url;
        document.head.appendChild(link);
        const shortcut = document.createElement("link");
        shortcut.rel = "shortcut icon";
        shortcut.href = url;
        document.head.appendChild(shortcut);
        const apple = document.createElement("link");
        apple.rel = "apple-touch-icon";
        apple.href = url;
        document.head.appendChild(apple);
      })
      .catch(() => {});
  }, []);

  return null;
}
