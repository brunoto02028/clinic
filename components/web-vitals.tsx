'use client';

import { useReportWebVitals } from 'next/web-vitals';

export function WebVitals() {
  useReportWebVitals((metric) => {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Web Vitals]', metric);
    }

    // Send to analytics in production
    if (process.env.NODE_ENV === 'production') {
      const body = JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
      });

      // Send to your analytics endpoint
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics/vitals', body);
      } else {
        fetch('/api/analytics/vitals', {
          body,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
        }).catch(console.error);
      }
    }

    // Log important metrics
    const { name, value, rating } = metric;
    
    // Color code based on rating
    const color = rating === 'good' ? '🟢' : rating === 'needs-improvement' ? '🟡' : '🔴';
    
    // Format value based on metric type
    const formattedValue = name === 'CLS' 
      ? value.toFixed(3)
      : name === 'FID' || name === 'INP' || name === 'TTFB'
      ? `${Math.round(value)}ms`
      : `${(value / 1000).toFixed(2)}s`;

    console.log(`${color} ${name}: ${formattedValue} (${rating})`);
  });

  return null;
}
