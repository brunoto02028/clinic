"use client";

import { useEffect } from "react";
import { hasAnalyticsConsent, hasMarketingConsent } from "@/components/cookie-consent";

interface PurchaseConversionProps {
  /** Order number — used as the transaction id so Ads and Meta can dedupe
   *  a reload or a re-visit into the same single sale. Never an email or name. */
  transactionId: string;
  value: number;
  currency: string;
}

/**
 * Fires the purchase conversion, and only the purchase conversion. Rendered
 * exclusively by the thank-you page, and only when the order is confirmed paid
 * server-side — firing on the buy click would teach Ads to chase clickers
 * instead of buyers.
 *
 * Carries value, currency and an order id. No name, email or address: the ad
 * platforms don't need them and sending them would leak a customer's details
 * into a third party.
 */
export function PurchaseConversion({ transactionId, value, currency }: PurchaseConversionProps) {
  useEffect(() => {
    const key = `purchase_sent_${transactionId}`;
    // Belt and braces with the platform-side dedupe: a reload in the same tab
    // never re-sends, even before the platform sees the transaction id.
    if (sessionStorage.getItem(key)) return;

    let cancelled = false;
    let tries = 0;

    // The GA script mounts after consent is granted, so it may not exist yet
    // on first paint. Poll briefly rather than miss the sale.
    const attempt = () => {
      if (cancelled) return;
      const analytics = hasAnalyticsConsent();
      const marketing = hasMarketingConsent();
      let sent = false;

      if (analytics && typeof window.gtag === "function") {
        window.gtag("event", "purchase", {
          transaction_id: transactionId,
          value,
          currency,
        });
        sent = true;
      }
      if (marketing && typeof window.fbq === "function") {
        window.fbq("track", "Purchase", { value, currency }, { eventID: transactionId });
        sent = true;
      }

      if (sent) {
        sessionStorage.setItem(key, "1");
        return;
      }
      // Give up quietly after ~5s: the visitor refused tracking, or a blocker
      // stopped the script. The Stripe webhook is what actually records the sale.
      if (++tries < 10) setTimeout(attempt, 500);
    };

    attempt();
    window.addEventListener("consent-updated", attempt);
    return () => {
      cancelled = true;
      window.removeEventListener("consent-updated", attempt);
    };
  }, [transactionId, value, currency]);

  return null;
}
