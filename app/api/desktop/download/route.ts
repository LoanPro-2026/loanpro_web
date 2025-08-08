import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

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
    console.log(`Desktop app download requested - Version: ${version}, IP: ${clientIP}`);
    
    // Track analytics (make it more robust)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                      'http://localhost:3000';
      
      await fetch(`${baseUrl}/api/analytics/track`, {
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
      console.log('Analytics tracking failed:', analyticsError);
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
    console.error('Download tracking failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Download failed'
    }, { status: 500 });
  }
}
