'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { hasAnalyticsConsent } from '@/components/cookie-consent';

const HOTJAR_ID = process.env.NEXT_PUBLIC_HOTJAR_ID || '0';
const HOTJAR_VERSION = 6;

export function Hotjar() {
  const [consentGranted, setConsentGranted] = useState(false);

  useEffect(() => {
    const checkConsent = () => setConsentGranted(hasAnalyticsConsent());
    checkConsent();
    window.addEventListener('consent-updated', checkConsent);
    return () => window.removeEventListener('consent-updated', checkConsent);
  }, []);

  useEffect(() => {
    if (consentGranted && typeof window !== 'undefined' && HOTJAR_ID !== '0') {
      (window as any).hj = (window as any).hj || function() {
        ((window as any).hj.q = (window as any).hj.q || []).push(arguments);
      };
      (window as any)._hjSettings = { hjid: HOTJAR_ID, hjsv: HOTJAR_VERSION };
    }
  }, [consentGranted]);

  if (process.env.NODE_ENV !== 'production' || HOTJAR_ID === '0' || !consentGranted) {
    return null;
  }

  return (
    <Script
      id="hotjar"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function(h,o,t,j,a,r){
            h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
            h._hjSettings={hjid:${HOTJAR_ID},hjsv:${HOTJAR_VERSION}};
            a=o.getElementsByTagName('head')[0];
            r=o.createElement('script');r.async=1;
            r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
            a.appendChild(r);
          })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
        `,
      }}
    />
  );
}

// Helper functions for Hotjar events
export const hotjar = {
  // Identify user
  identify: (userId: string, attributes?: Record<string, any>) => {
    if (typeof window !== 'undefined' && (window as any).hj) {
      (window as any).hj('identify', userId, attributes);
    }
  },

  // Track events
  event: (eventName: string) => {
    if (typeof window !== 'undefined' && (window as any).hj) {
      (window as any).hj('event', eventName);
    }
  },

  // Trigger specific recordings
  trigger: (triggerName: string) => {
    if (typeof window !== 'undefined' && (window as any).hj) {
      (window as any).hj('trigger', triggerName);
    }
  },

  // Tag recordings
  tagRecording: (tags: string[]) => {
    if (typeof window !== 'undefined' && (window as any).hj) {
      tags.forEach(tag => (window as any).hj('tagRecording', [tag]));
    }
  },
};
