'use client';

type FunnelPrimitive = string | number | boolean | null;
type FunnelPayload = Record<string, FunnelPrimitive | FunnelPrimitive[] | Record<string, FunnelPrimitive>>;

const VISITOR_ID_KEY = 'loanpro_visitor_id_v1';
const FIRST_TOUCH_KEY = 'loanpro_first_touch_utm_v1';

function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function safeLocalStorageGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage write failures.
  }
}

export function getVisitorId(): string {
  const existing = safeLocalStorageGet(VISITOR_ID_KEY);
  if (existing) return existing;

  const generated = randomId('v');
  safeLocalStorageSet(VISITOR_ID_KEY, generated);
  return generated;
}

export function getCurrentUtmParams(): Record<string, string> {
  if (typeof window === 'undefined') return {};

  const url = new URL(window.location.href);
  const utmParams: Record<string, string> = {};
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

  keys.forEach((key) => {
    const value = url.searchParams.get(key);
    if (value) {
      utmParams[key] = value;
    }
  });

  return utmParams;
}

export function getFirstTouchUtmParams(): Record<string, string> {
  const current = getCurrentUtmParams();
  if (Object.keys(current).length > 0) {
    safeLocalStorageSet(FIRST_TOUCH_KEY, JSON.stringify(current));
    return current;
  }

  const stored = safeLocalStorageGet(FIRST_TOUCH_KEY);
  if (!stored) return {};

  try {
    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, string>;
    }
    return {};
  } catch {
    return {};
  }
}

export async function trackFunnelEvent(eventName: string, payload: FunnelPayload = {}): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const body = {
      eventName,
      visitorId: getVisitorId(),
      pagePath: window.location.pathname,
      referrer: document.referrer || undefined,
      utm: getFirstTouchUtmParams(),
      payload,
      occurredAt: new Date().toISOString(),
    };

    await fetch('/api/analytics/funnel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {
    // Do not surface tracking failures to users.
  }
}
