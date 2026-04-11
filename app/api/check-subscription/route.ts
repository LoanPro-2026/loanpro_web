export const runtime = "nodejs";
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getUserWithSubscription, getSubscriptionStatus } from '@/lib/subscriptionHelpers';
import { getPlanFeatures } from '@/lib/planFeatures';
import { getEffectivePlanFeatures } from '@/lib/planConfig';
import { logger } from '@/lib/logger';
import { enforceRequestRateLimit, parseJsonRequest, toSafeErrorResponse } from '@/lib/apiSafety';

export async function POST(req: Request) {
  try {
    const rateLimitResponse = enforceRequestRateLimit({
      request: req,
      scope: 'check-subscription',
      limit: 80,
      windowMs: 60 * 1000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const parsedBody = await parseJsonRequest<Record<string, unknown>>(req, { maxBytes: 48 * 1024 });
    if (!parsedBody.ok) return parsedBody.response;

    const body = parsedBody.data as Record<string, any>;
    const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';
    const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
    const skipDeviceCheck = body.skipDeviceCheck === true;

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token required' }, { status: 400 });
    }

    const db = (await clientPromise).db('AdminDB');
    const user = await db.collection('users').findOne({ accessToken });

    if (!user) {
      return NextResponse.json({ 
        error: 'Invalid access token',
        status: 'invalid_token'
      }, { status: 401 });
    }

    // Check device binding if deviceId is provided AND we're not skipping device check
    // skipDeviceCheck = true for initial login (before device binding)
    // skipDeviceCheck = false for auto-login (after device should be bound)
    if (deviceId && !skipDeviceCheck) {
      type Device = {
        deviceId: string;
        status: string;
        lastActive?: Date;
        // add other properties if needed
      };
      const userDevices: Device[] = user.devices || [];
      const deviceFound = userDevices.find((device: Device) => 
        device.deviceId === deviceId && device.status === 'active'
      );

      if (!deviceFound) {
        return NextResponse.json({
          error: 'Device not authorized',
          status: 'device_not_authorized',
          message: 'This device is not authorized to access your account. Please log in and authorize this device.',
          requiresDeviceBinding: true
        }, { status: 403 });
      }

      // Update device last active time
      await db.collection('users').updateOne(
        { accessToken, 'devices.deviceId': deviceId },
        { 
          $set: { 
            'devices.$.lastActive': new Date()
          } 
        }
      );
    }

    // Get user with enriched subscription data
    const { subscription } = await getUserWithSubscription(user.userId, db);

    let subscriptionStatus = 'expired';
    let daysRemaining = 0;
    let features = {};
    let isInGracePeriod = false;
    let resolvedPlanFeatures: Awaited<ReturnType<typeof getEffectivePlanFeatures>> | null = null;
    const hasAccess = subscription ? getSubscriptionStatus(subscription) !== 'expired' : false;
    const subscriptionPlanName = subscription?.plan || 'basic';

    if (subscription) {
      subscriptionStatus = getSubscriptionStatus(subscription);
      daysRemaining = subscription.daysRemaining || 0;
      isInGracePeriod = subscription.isInGracePeriod || false;

      // Resolve features from DB-backed config with static fallback.
      resolvedPlanFeatures = await getEffectivePlanFeatures(db, subscription.plan);
      features = hasAccess ? resolvedPlanFeatures.features : {};

      if (!hasAccess) {
        // Grace period expired - schedule for deletion
        subscriptionStatus = 'expired';
        
        await db.collection('users').updateOne(
          { accessToken },
          { 
            $set: { 
              status: 'scheduled_for_deletion',
              deletionScheduledAt: new Date()
            } 
          }
        );
      }
    }

    // Update last access time
    await db.collection('users').updateOne(
      { accessToken },
      { 
        $set: { 
          lastAccessedAt: new Date()
        } 
      }
    );

    return NextResponse.json({
      success: true,
      subscriptionStatus,
      subscriptionPlan: subscription?.plan || 'none',
      daysRemaining,
      expiresAt: subscription?.endDate || null,
      gracePeriodEndsAt: subscription?.gracePeriodEndsAt || null,
      isInGracePeriod,
      features,
      maxDevices: hasAccess ? (resolvedPlanFeatures?.maxDevices ?? getPlanFeatures(subscriptionPlanName).maxDevices) : 0,
      cloudStorageLimit: hasAccess ? (resolvedPlanFeatures?.cloudStorageGB ?? getPlanFeatures(subscriptionPlanName).cloudStorageGB) : 0,
      dataUsage: user.dataUsage || 0,
      devices: user.devices || [],
      user: {
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    logger.error('Error checking subscription status', error, 'CHECK_SUBSCRIPTION');
    return toSafeErrorResponse(error, 'CHECK_SUBSCRIPTION', 'Error checking subscription status');
  }
}

export async function GET() {
  return NextResponse.json({ 
    error: 'Method not allowed. Use POST request.' 
  }, { status: 405 });
}
