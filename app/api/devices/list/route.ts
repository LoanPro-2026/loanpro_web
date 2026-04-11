import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getCorsHeaders, handleCorsPreFlight } from '@/lib/cors';
import { getDeviceLimitForPlan, resolveEffectivePlanForUser } from '@/lib/subscriptionPlan';
import { logger } from '@/lib/logger';
import { enforceRequestRateLimit, parseJsonRequest, toSafeErrorResponse } from '@/lib/apiSafety';

export function OPTIONS(req: Request) {
  return handleCorsPreFlight(req);
}

export async function POST(req: Request) {
  const corsHeaders = getCorsHeaders(req);
  const applyCors = (response: NextResponse) => {
    Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value));
    return response;
  };

  try {
    const rateLimitResponse = enforceRequestRateLimit({
      request: req,
      scope: 'devices-list-token',
      limit: 100,
      windowMs: 60 * 1000,
    });
    if (rateLimitResponse) return applyCors(rateLimitResponse);

    const parsedBody = await parseJsonRequest<Record<string, unknown>>(req, { maxBytes: 32 * 1024 });
    if (!parsedBody.ok) return applyCors(parsedBody.response);

    const body = parsedBody.data as Record<string, any>;
    const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token required' }, { status: 400, headers: corsHeaders });
    }

    const client = await clientPromise;
    const db = client.db('AdminDB');
    const user = await db.collection('users').findOne({ accessToken });

    if (!user) {
      return NextResponse.json({ 
        error: 'Invalid access token',
        status: 'invalid_token'
      }, { status: 401, headers: corsHeaders });
    }

    const devices = user.devices || [];
    const activeDevices = devices.filter((device: any) => device.status === 'active');

    const subscriptionPlan = await resolveEffectivePlanForUser(db, user);
    const deviceLimit = getDeviceLimitForPlan(subscriptionPlan);

    return NextResponse.json({
      success: true,
      devices: activeDevices,
      deviceCount: activeDevices.length,
      deviceLimit: deviceLimit,
      canAddDevice: activeDevices.length < deviceLimit,
      subscriptionPlan: subscriptionPlan
    }, { headers: corsHeaders });

  } catch (error) {
    logger.error('Error listing devices', error, 'DEVICES_API');
    return applyCors(toSafeErrorResponse(error, 'DEVICES_API', 'Error listing devices'));
  }
}
