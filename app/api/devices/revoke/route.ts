import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import emailService from '@/services/emailService';
import { logger } from '@/lib/logger';
import { enforceRequestRateLimit, parseJsonRequest, toSafeErrorResponse } from '@/lib/apiSafety';

export async function POST(request: NextRequest) {
  try {
    const authResult = await auth();
    const userId = authResult.userId;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitResponse = enforceRequestRateLimit({
      request,
      scope: 'devices-revoke',
      limit: 20,
      windowMs: 60 * 1000,
      userId,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const parsedBody = await parseJsonRequest<Record<string, unknown>>(request, { maxBytes: 32 * 1024 });
    if (!parsedBody.ok) return parsedBody.response;

    const body = parsedBody.data as Record<string, any>;
    const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
    const reason = typeof body.reason === 'string' && body.reason.trim().length > 0
      ? body.reason.trim()
      : 'User revoked';
    if (!deviceId) {
      return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    // Check monthly revoke limit
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const revokesThisMonth = await db.collection('device_revokes').countDocuments({
      userId,
      revokedAt: { $gte: currentMonthStart }
    });
    
    if (revokesThisMonth >= 3) {
      return NextResponse.json({
        error: 'Monthly revoke limit exceeded',
        message: 'You can only revoke 3 devices per month. Limit resets at the beginning of each month.',
        revokesThisMonth,
        maxRevokesPerMonth: 3
      }, { status: 429 });
    }

    // Get current user with access token from Clerk user
    const userWithToken = await db.collection('users').findOne({ 
      $or: [
        { userId },
        { email: authResult.sessionClaims?.email }
      ]
    });

    if (!userWithToken?.accessToken) {
      return NextResponse.json({ error: 'User access token not found' }, { status: 404 });
    }

    // Find the device to get its details before revoking
    const deviceToRevoke = userWithToken.devices?.find((d: any) => d.deviceId === deviceId);
    if (!deviceToRevoke) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    // Check if device is active (we only allow revoking active devices)
    if (deviceToRevoke.status !== 'active') {
      return NextResponse.json({ error: 'Device is not active or already revoked' }, { status: 400 });
    }

    // Revoke the device by completely removing it from the devices array
    await db.collection('users').updateOne(
      { accessToken: userWithToken.accessToken },
      { 
        $pull: { devices: { deviceId: deviceId } } as any,
        $set: { updatedAt: now }
      }
    );

    // Record the revoke action for tracking
    await db.collection('device_revokes').insertOne({
      userId,
      deviceId,
      deviceName: deviceToRevoke.deviceName || 'Unknown Device',
      deviceInfo: deviceToRevoke.deviceInfo || {},
      reason,
      revokedAt: now,
      createdAt: now
    });

    const resolvedEmail = userWithToken?.email || '';
    const resolvedName =
      userWithToken?.fullName ||
      userWithToken?.username ||
      (resolvedEmail ? resolvedEmail.split('@')[0] : 'Customer');

    if (resolvedEmail) {
      Promise.resolve(
        emailService.sendDeviceRevokedEmail({
          userName: resolvedName,
          userEmail: resolvedEmail,
          deviceName: deviceToRevoke.deviceName || 'Unknown Device',
          deviceId: deviceToRevoke.deviceId || deviceId,
          reason
        })
      ).catch(() => undefined);
    }

    const remainingRevokes = Math.max(0, 2 - revokesThisMonth); // 2 because we just used one

    return NextResponse.json({
      success: true,
      message: 'Device revoked successfully',
      revokesThisMonth: revokesThisMonth + 1,
      remainingRevokes,
      maxRevokesPerMonth: 3
    });

  } catch (error) {
    logger.error('Device revoke API error', error, 'DEVICES_API');
    return toSafeErrorResponse(error, 'DEVICES_API', 'Failed to revoke device');
  }
}
