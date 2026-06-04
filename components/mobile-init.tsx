"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

/**
 * MobileInit — Invisible component that initializes Capacitor native features.
 * Should be placed once in the root layout.
 * Safe on web — all imports are dynamic and guarded by platform checks.
 */
export function MobileInit() {
  const { data: session } = useSession();

  useEffect(() => {
    initMobile();
  }, []);

  // Register push token when user logs in
  useEffect(() => {
    if (session?.user) {
      registerPush();
    }
  }, [session]);

  return null;
}

async function initMobile() {
  try {
    const { isNative, setStatusBarDark, addAppStateListener } = await import("@/lib/mobile");

    if (!isNative) return;

    // Add native-app class to HTML element for CSS targeting
    document.documentElement.classList.add("native-app");

    // Set status bar style
    await setStatusBarDark();

    // Hide splash screen after a short delay
    const { SplashScreen } = await import("@capacitor/splash-screen");
    setTimeout(() => SplashScreen.hide(), 500);

    // Listen for app resume — could refresh data
    addAppStateListener(() => {
      console.log("[Mobile] App resumed");
    });

    console.log("[Mobile] Native init complete");
  } catch (err) {
    // Silently fail on web
  }
}

async function registerPush() {
  try {
    const { isNative, registerPushNotifications, addPushListeners } = await import("@/lib/mobile");
    const { Capacitor } = await import("@capacitor/core");

    if (!isNative) return;

    const token = await registerPushNotifications();
    if (!token) return;

    // Save token to server
    await fetch("/api/push-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        platform: Capacitor.getPlatform(),
      }),
    });

    // Listen for incoming push notifications
    addPushListeners((notification: any) => {
      const url = notification?.data?.url;
      if (url && typeof window !== "undefined") {
        window.location.href = url;
      }
    });

    console.log("[Mobile] Push registered:", token.substring(0, 20) + "...");
  } catch (err) {
    // Silently fail
  }
}
