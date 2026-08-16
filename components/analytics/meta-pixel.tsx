"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { hasMarketingConsent } from "@/components/cookie-consent";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

/**
 * Meta (Instagram/Facebook) pixel. Renders nothing until two things are true:
 * an ad account ID is configured, and the visitor accepted marketing cookies.
 * Loading it any earlier would track people who refused ad tracking.
 */
export function MetaPixel() {
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    const check = () => setGranted(hasMarketingConsent());
    check();
    window.addEventListener("consent-updated", check);
    return () => window.removeEventListener("consent-updated", check);
  }, []);

  if (!PIXEL_ID || !granted) return null;

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${PIXEL_ID}');fbq('track','PageView');`}
    </Script>
  );
}

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}
