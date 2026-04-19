'use client';

export type PublicSalesConfig = {
  salesPhone: string;
  salesHours: string;
  salesCallEnabled: boolean;
  salesWidgetEnabled: boolean;
  salesDefaultMessage: string;
  supportEmail: string;
};

const FALLBACK_CONFIG: PublicSalesConfig = {
  salesPhone: '+91 78988 85129',
  salesHours: 'Monday-Saturday, 10:00 AM to 7:00 PM IST',
  salesCallEnabled: true,
  salesWidgetEnabled: true,
  salesDefaultMessage: 'I want to talk to an agent before choosing a plan.',
  supportEmail: 'support@loanpro.tech',
};

export function getFallbackSalesConfig(): PublicSalesConfig {
  return FALLBACK_CONFIG;
}

export async function fetchPublicSalesConfig(): Promise<PublicSalesConfig> {
  try {
    const response = await fetch('/api/config', { credentials: 'include' });
    const data = await response.json();
    if (response.ok && data?.success && data?.salesConfig) {
      return {
        ...FALLBACK_CONFIG,
        ...data.salesConfig,
      };
    }
  } catch {
    // Fall back to defaults below.
  }

  return FALLBACK_CONFIG;
}
