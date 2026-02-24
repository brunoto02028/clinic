"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

interface VersionData {
  version: string;
  timestamp: number;
}

// Check interval: 30 seconds
const CHECK_INTERVAL = 30 * 1000;

export function VersionChecker() {
  const currentVersion = useRef<VersionData | null>(null);
  const pathname = usePathname();
  const isChecking = useRef(false);

  const checkVersion = useCallback(async () => {
    if (isChecking.current) return;
    isChecking.current = true;

    try {
      const response = await fetch("/api/version", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        },
      });

      if (!response.ok) return;

      const newVersion: VersionData = await response.json();

      // First load - store the version
      if (!currentVersion.current) {
        currentVersion.current = newVersion;
        console.log("[Version Checker] Initial version:", newVersion.version);
        return;
      }

      // Version check disabled — auto-reload caused infinite loop in production
      // if (currentVersion.current.version !== newVersion.version) { window.location.reload(); }
    } catch (error) {
      console.error("[Version Checker] Error checking version:", error);
    } finally {
      isChecking.current = false;
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkVersion();

    // Set up periodic checking
    const interval = setInterval(checkVersion, CHECK_INTERVAL);

    // Also check when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkVersion();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Also check on focus
    const handleFocus = () => {
      checkVersion();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [checkVersion]);

  // Check on route change
  useEffect(() => {
    checkVersion();
  }, [pathname, checkVersion]);

  // This component doesn't render anything
  return null;
}
