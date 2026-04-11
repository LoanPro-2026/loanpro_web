import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { logger } from '@/lib/logger';

const PUBLIC_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://loanpro.tech').replace(/\/$/, '');
const ANALYTICS_TIMEOUT_MS = 5000;

const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = ANALYTICS_TIMEOUT_MS): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const version = searchParams.get('version') || '1.0.0';
    const headersList = await headers();
    const userAgent = headersList.get('user-agent') || 'unknown';
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIP = headersList.get('x-real-ip');
    const clientIP = forwardedFor || realIP || 'unknown';
    
    // Track download
    logger.info('Desktop app download requested', 'DESKTOP_DOWNLOAD', { version, clientIP });
    
    // Track analytics (make it more robust)
    try {
      const requestOrigin = new URL(request.url).origin;
      const baseUrl = requestOrigin || PUBLIC_BASE_URL;
      
      await fetchWithTimeout(`${baseUrl}/api/analytics/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'desktop_app_download',
          version,
          userAgent,
          ip: clientIP,
          timestamp: new Date().toISOString()
        })
      });
    } catch (analyticsError) {
      logger.warn('Download analytics tracking failed', 'DESKTOP_DOWNLOAD', {
        error: analyticsError instanceof Error ? analyticsError.message : 'unknown',
      });
      // Don't fail the download if analytics fails
    }
    
    // Return download URL (you can also implement direct file serving here)
    return NextResponse.json({
      success: true,
      downloadUrl: `/downloads/LoanPro-Setup-${version}.exe`,
      version,
      message: 'Download initiated'
    });
  } catch (error) {
    logger.error('Download tracking failed', error, 'DESKTOP_DOWNLOAD');
    return NextResponse.json({
      success: false,
      error: 'Download failed'
    }, { status: 500 });
  }
}
