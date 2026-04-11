// app/api/devices/request-switch/route.ts

import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getCorsHeaders, handleCorsPreFlight } from '@/lib/cors';
import emailService from '@/services/emailService';
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
      scope: 'devices-request-switch',
      limit: 30,
      windowMs: 60 * 1000,
    });
    if (rateLimitResponse) return applyCors(rateLimitResponse);

    const parsedBody = await parseJsonRequest<Record<string, unknown>>(req, { maxBytes: 48 * 1024 });
    if (!parsedBody.ok) return applyCors(parsedBody.response);

    const body = parsedBody.data as Record<string, any>;
    const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';
    const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
    const deviceName = typeof body.deviceName === 'string' ? body.deviceName.trim() : '';

    if (!accessToken)
      return NextResponse.json({ error: 'Missing accessToken' }, { status: 400, headers: corsHeaders });

    if (!deviceId)
      return NextResponse.json({ error: 'Missing deviceId' }, { status: 400, headers: corsHeaders });

    const client = await clientPromise;
    const db = client.db('AdminDB');

    const user = await db.collection('users').findOne({ accessToken });
    if (!user)
      return NextResponse.json({ error: 'Invalid access token' }, { status: 401, headers: corsHeaders });

    const deviceEntry = {
      deviceId,
      deviceName: deviceName || 'Unnamed Device',
      status: 'pending',
      lastActive: new Date(),
    };

    await db.collection('users').updateOne(
      { accessToken },
      { $push: { devices: deviceEntry } } as any
    );

    const resolvedEmail = user.email || '';
    const resolvedName =
      user.fullName ||
      user.username ||
      (resolvedEmail ? resolvedEmail.split('@')[0] : 'Customer');

    if (resolvedEmail) {
      Promise.resolve(
        emailService.sendDeviceSwitchRequestedEmail({
          userName: resolvedName,
          userEmail: resolvedEmail,
          deviceName: deviceEntry.deviceName,
          deviceId: deviceEntry.deviceId,
          requestedAt: deviceEntry.lastActive
        })
      ).catch(() => undefined);
    }

    return NextResponse.json({ success: true, message: 'Device switch requested', device: deviceEntry }, { headers: corsHeaders });

  } catch (error) {
    logger.error('Device switch request API error', error, 'DEVICES_API');
    return applyCors(toSafeErrorResponse(error, 'DEVICES_API', 'Failed to request device switch'));
  }
}
