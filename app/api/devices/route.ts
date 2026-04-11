import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getCorsHeaders, handleCorsPreFlight } from '@/lib/cors';
import { logger } from '@/lib/logger';
import { enforceRequestRateLimit, parseJsonRequest, toSafeErrorResponse } from '@/lib/apiSafety';

export function OPTIONS(req: Request) {
  return handleCorsPreFlight(req);
}

// Clerk-authenticated device listing (for web dashboard)
export async function GET(req: Request) {
  try {
    // Dynamically import Clerk auth to avoid breaking API for Electron
    const { auth } = await import('@clerk/nextjs/server');
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const client = await clientPromise;
    const db = client.db('AdminDB');
    const user = await db.collection('users').findOne({ userId });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ devices: user.devices || [] });
  } catch (error) {
    logger.error('Device list API error (Clerk)', error, 'DEVICES_API');
    return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 });
  }
}

// Electron app: POST with accessToken
export async function POST(req: Request) {
  const corsHeaders = getCorsHeaders(req);
  const applyCors = (response: NextResponse) => {
    Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value));
    return response;
  };
  try {
    const rateLimitResponse = enforceRequestRateLimit({
      request: req,
      scope: 'devices-list',
      limit: 100,
      windowMs: 60 * 1000,
    });
    if (rateLimitResponse) return applyCors(rateLimitResponse);

    const parsedBody = await parseJsonRequest<Record<string, unknown>>(req, { maxBytes: 32 * 1024 });
    if (!parsedBody.ok) return applyCors(parsedBody.response);

    const body = parsedBody.data as Record<string, any>;
    const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';
    if (!accessToken) return NextResponse.json({ error: 'Missing accessToken' }, { status: 400, headers: corsHeaders });
    const client = await clientPromise;
    const db = client.db('AdminDB');
    const user = await db.collection('users').findOne({ accessToken });
    if (!user) return NextResponse.json({ error: 'Invalid access token' }, { status: 401, headers: corsHeaders });
    return NextResponse.json({ devices: user.devices || [] }, { headers: corsHeaders });
  } catch (error) {
    logger.error('Device list API error (desktop token)', error, 'DEVICES_API');
    return applyCors(toSafeErrorResponse(error, 'DEVICES_API', 'Failed to fetch devices'));
  }
} 