'use client';

import { GoogleAnalytics as GA } from '@next/third-parties/google';
import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { hasAnalyticsConsent } from '@/components/cookie-consent';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-XXXXXXXXXX';

export function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [consentGranted, setConsentGranted] = useState(false);

  useEffect(() => {
    const checkConsent = () => setConsentGranted(hasAnalyticsConsent());
    checkConsent();
    window.addEventListener('consent-updated', checkConsent);
    return () => window.removeEventListener('consent-updated', checkConsent);
  }, []);

  useEffect(() => {
    if (consentGranted && pathname) {
      window.gtag?.('config', GA_ID, {
        page_path: pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : ''),
      });
    }
  }, [pathname, searchParams, consentGranted]);

  if (process.env.NODE_ENV !== 'production' || !consentGranted) {
    return null;
  }

  return <GA gaId={GA_ID} />;
}

// Helper functions for tracking events
export const trackEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
};

// Specific tracking functions
export const analytics = {
  // User actions
  login: (method: string) => trackEvent('login', { method }),
  signup: (method: string) => trackEvent('sign_up', { method }),
  
  // Foot scan events
  scanUploaded: (patientId: string, scanType: string) => 
    trackEvent('scan_uploaded', { patient_id: patientId, scan_type: scanType }),
  
  scanAnalyzed: (scanId: string, duration: number) => 
    trackEvent('scan_analyzed', { scan_id: scanId, duration_seconds: duration }),
  
  insoleGenerated: (scanId: string, duration: number, success: boolean) => 
    trackEvent('insole_generated', { 
      scan_id: scanId, 
      duration_seconds: duration,
      success 
    }),
  
  insoleDownloaded: (scanId: string, fileType: string) => 
    trackEvent('insole_downloaded', { scan_id: scanId, file_type: fileType }),
  
  // Patient portal
  patientViewed3D: (scanId: string) => 
    trackEvent('patient_viewed_3d', { scan_id: scanId }),
  
  patientViewedTimeline: (scanId: string) => 
    trackEvent('patient_viewed_timeline', { scan_id: scanId }),
  
  // Notifications
  notificationSent: (type: string, channel: string) => 
    trackEvent('notification_sent', { type, channel }),
  
  notificationOpened: (notificationId: string) => 
    trackEvent('notification_opened', { notification_id: notificationId }),
  
  // Payments
  subscriptionStarted: (plan: string, amount: number) => 
    trackEvent('subscription_started', { plan, value: amount, currency: 'GBP' }),
  
  subscriptionCancelled: (plan: string, reason?: string) => 
    trackEvent('subscription_cancelled', { plan, reason }),
  
  // Engagement
  videoWatched: (videoId: string, duration: number) => 
    trackEvent('video_watched', { video_id: videoId, duration_seconds: duration }),
  
  helpArticleViewed: (articleId: string) => 
    trackEvent('help_article_viewed', { article_id: articleId }),
  
  // Errors
  error: (errorMessage: string, errorLocation: string) => 
    trackEvent('error', { message: errorMessage, location: errorLocation }),
};

// TypeScript declaration
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}
