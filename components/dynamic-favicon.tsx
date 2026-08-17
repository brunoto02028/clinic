"use client";

import { useEffect } from "react";
import { getSettings } from "@/lib/settings-client";

export function DynamicFavicon() {
  useEffect(() => {
    getSettings()
      .then((data) => {
        if (data?.faviconUrl) {
          // Manipulate DOM directly instead of createPortal to avoid hydration mismatch
          const url = data.faviconUrl;

          // Update existing favicon links or create new ones
          const updateOrCreate = (rel: string) => {
            let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
            if (link) {
              link.href = url;
            } else {
              link = document.createElement("link");
              link.rel = rel;
              link.href = url;
              document.head.appendChild(link);
            }
          };

          updateOrCreate("icon");
          updateOrCreate("shortcut icon");
          updateOrCreate("apple-touch-icon");
        }
      })
      .catch(() => {});
  }, []);

  return null;
}
