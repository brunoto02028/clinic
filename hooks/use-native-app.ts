"use client";

import { useState, useEffect } from "react";

/**
 * Detects if the app is running inside a Capacitor native container (iOS/Android).
 * Returns false on web/browser.
 */
export function useIsNativeApp(): boolean {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    // Check if Capacitor injected native bridge
    const w = window as any;
    const native =
      !!w.Capacitor?.isNativePlatform?.() ||
      document.documentElement.classList.contains("native-app");
    setIsNative(native);
  }, []);

  return isNative;
}

/**
 * Returns the native platform: 'ios', 'android', or 'web'.
 */
export function useNativePlatform(): "ios" | "android" | "web" {
  const [platform, setPlatform] = useState<"ios" | "android" | "web">("web");

  useEffect(() => {
    const w = window as any;
    setPlatform(w.Capacitor?.getPlatform?.() || "web");
  }, []);

  return platform;
}
