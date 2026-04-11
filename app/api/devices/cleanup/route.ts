import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getDeviceLimitForPlan, resolveEffectivePlanForUser } from '@/lib/subscriptionPlan';
import { logger } from '@/lib/logger';
import { enforceRequestRateLimit, parseJsonRequest, toSafeErrorResponse } from '@/lib/apiSafety';

const INTERNAL_CLEANUP_SECRET = String(process.env.INTERNAL_CLEANUP_SECRET || '').trim();

function isAuthorizedInternalRequest(req: Request): boolean {
  if (!INTERNAL_CLEANUP_SECRET) return false;
  const provided = (req.headers.get('x-internal-cleanup-secret') || '').trim();
  return provided.length > 0 && provided === INTERNAL_CLEANUP_SECRET;
}

async function cleanupDevices(accessToken: string) {
  try {
    const client = await clientPromise;
    const db = client.db('AdminDB');
    
    const user = await db.collection('users').findOne({ accessToken });
    if (!user) {
      logger.warn('Device cleanup user not found', 'DEVICES_API');
      return;
    }
    
    // Keep only the most recent device (or first device if same timestamp)
    const devices = user.devices || [];
    const uniqueDevices = new Map();
    
    // Group devices by deviceId, keeping the most recent
    devices.forEach((device: any) => {
      const existing = uniqueDevices.get(device.deviceId);
      if (!existing || new Date(device.lastActive) > new Date(existing.lastActive)) {
        uniqueDevices.set(device.deviceId, device);
      }
    });
    
    const cleanedDevices = Array.from(uniqueDevices.values());
    
    // Update user with cleaned devices
    await db.collection('users').updateOne(
      { accessToken },
      { $set: { devices: cleanedDevices } }
    );
    
    logger.info('Device cleanup completed', 'DEVICES_API', {
      before: devices.length,
      after: cleanedDevices.length,
      cleaned: devices.length - cleanedDevices.length,
    });
    return {
      before: devices.length,
      after: cleanedDevices.length,
      cleaned: devices.length - cleanedDevices.length
    };
    
  } catch (error) {
    logger.error('Device cleanup execution failed', error, 'DEVICES_API');
    throw error;
  }
}

async function testDeviceLimit(accessToken: string) {
  try {
    const client = await clientPromise;
    const db = client.db('AdminDB');
    
    const user = await db.collection('users').findOne({ accessToken });
    if (!user) {
      return { error: 'User not found' };
    }

    const subscriptionPlan = await resolveEffectivePlanForUser(db, user);
    const activeDevices = (user.devices || []).filter((d: any) => d.status === 'active');
    const deviceLimit = getDeviceLimitForPlan(subscriptionPlan);
    
    return {
      subscriptionPlan,
      activeDevices: activeDevices.length,
      deviceLimit,
      canAddDevice: activeDevices.length < deviceLimit,
      devices: activeDevices.map((d: any) => ({
        deviceId: d.deviceId.substring(0, 8) + '...',
        deviceName: d.deviceName,
        lastActive: d.lastActive
      }))
    };
    
  } catch (error) {
    logger.error('Device cleanup test failed', error, 'DEVICES_API');
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    if (!isAuthorizedInternalRequest(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitResponse = enforceRequestRateLimit({
      request: req,
      scope: 'devices-cleanup-internal',
      limit: 30,
      windowMs: 60 * 1000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const parsedBody = await parseJsonRequest<Record<string, unknown>>(req, { maxBytes: 32 * 1024 });
    if (!parsedBody.ok) return parsedBody.response;

    const body = parsedBody.data as Record<string, any>;
    const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';
    const action = typeof body.action === 'string' ? body.action.trim() : '';

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token required' }, { status: 400 });
    }

    if (action === 'cleanup') {
      const result = await cleanupDevices(accessToken);
      return NextResponse.json({ 
        success: true, 
        message: `Cleaned up ${result?.cleaned || 0} duplicate devices`,
        result 
      });
    } else if (action === 'test') {
      const result = await testDeviceLimit(accessToken);
      return NextResponse.json({ success: true, result });
    } else {
      return NextResponse.json({ error: 'Invalid action. Use "cleanup" or "test"' }, { status: 400 });
    }

  } catch (error) {
    logger.error('Cleanup API error', error, 'DEVICES_API');
    return toSafeErrorResponse(error, 'DEVICES_API', 'Internal server error');
  }
}
