export const runtime = "nodejs";
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getUserWithSubscription, getSubscriptionStatus } from '@/lib/subscriptionHelpers';
import { getPlanFeatures } from '@/lib/planFeatures';
import { getEffectivePlanFeatures } from '@/lib/planConfig';

export async function POST(req: Request) {
  try {
    const { accessToken, deviceId, skipDeviceCheck = false } = await req.json();

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

    const now = new Date();
    let subscriptionStatus = 'expired';
    let daysRemaining = 0;
    let features = {};
    let isInGracePeriod = false;
    let resolvedPlanFeatures: Awaited<ReturnType<typeof getEffectivePlanFeatures>> | null = null;

    if (subscription) {
      subscriptionStatus = getSubscriptionStatus(subscription);
      daysRemaining = subscription.daysRemaining || 0;
      isInGracePeriod = subscription.isInGracePeriod || false;

      // Resolve features from DB-backed config with static fallback.
      resolvedPlanFeatures = await getEffectivePlanFeatures(db, subscription.plan);
      features = resolvedPlanFeatures.features;

      if ((subscription.daysRemaining || 0) <= 0 && !isInGracePeriod) {
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
      maxDevices: subscription ? (resolvedPlanFeatures?.maxDevices ?? getPlanFeatures(subscription.plan).maxDevices) : 0,
      cloudStorageLimit: subscription ? (resolvedPlanFeatures?.cloudStorageGB ?? getPlanFeatures(subscription.plan).cloudStorageGB) : 0,
      dataUsage: user.dataUsage || 0,
      devices: user.devices || [],
      user: {
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Error checking subscription status:', error);
    return NextResponse.json(
      { error: 'Error checking subscription status' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    error: 'Method not allowed. Use POST request.' 
  }, { status: 405 });
}
