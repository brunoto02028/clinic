"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

interface VersionData {
  version: string;
  timestamp: number;
}

// Check every 60 seconds
const CHECK_INTERVAL = 60 * 1000;
const STORAGE_KEY = "bpr_app_version";

export function VersionChecker() {
  const initialVersion = useRef<string | null>(null);
  const pathname = usePathname();
  const isChecking = useRef(false);
  const updatePending = useRef(false);
  const hasReloaded = useRef(false);

  const doReload = useCallback(() => {
    if (hasReloaded.current) return;
    hasReloaded.current = true;
    window.location.reload();
  }, []);

  const checkVersion = useCallback(async () => {
    if (isChecking.current || hasReloaded.current) return;
    isChecking.current = true;

    try {
      const response = await fetch("/api/version", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" },
      });
      if (!response.ok) return;

      const data: VersionData = await response.json();
      const serverVersion = data.version;

      // First load — store version
      if (!initialVersion.current) {
        const storedVersion = sessionStorage.getItem(STORAGE_KEY);
        initialVersion.current = serverVersion;
        if (storedVersion === serverVersion) return;
        sessionStorage.setItem(STORAGE_KEY, serverVersion);
        return;
      }

      // Version changed — mark update pending (don't reload yet!)
      if (initialVersion.current !== serverVersion) {
        sessionStorage.setItem(STORAGE_KEY, serverVersion);
        updatePending.current = true;
      }
    } catch {
      // silent
    } finally {
      isChecking.current = false;
    }
  }, []);

  useEffect(() => {
    checkVersion();
    const interval = setInterval(checkVersion, CHECK_INTERVAL);

    // Only auto-reload when user RETURNS to the tab (was away, so nothing to lose)
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && updatePending.current) {
        doReload();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [checkVersion, doReload]);

  // On route change — safe moment to reload (user already navigated away from current page)
  useEffect(() => {
    if (updatePending.current) {
      doReload();
    }
  }, [pathname, doReload]);

  return null;
}
