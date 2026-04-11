export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-GVL0LFRVRB';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

function canTrack(): boolean {
  return (
    Boolean(GA_MEASUREMENT_ID) &&
    typeof window !== 'undefined' &&
    typeof window.gtag === 'function'
  );
}

export function trackPageView(url: string): void {
  if (!canTrack()) return;

  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: url,
  });
}

export function trackEvent(eventName: string, params: Record<string, unknown> = {}): void {
  if (!canTrack()) return;
  window.gtag('event', eventName, params);
}
