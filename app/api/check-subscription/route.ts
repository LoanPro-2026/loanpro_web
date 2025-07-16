export const runtime = "nodejs";
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(req: Request) {
  try {
    const { accessToken } = await req.json();

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

    const now = new Date();

    // Check subscription status
    let subscriptionStatus = 'expired';
    let daysRemaining = 0;
    let features = {};
    let isInGracePeriod = false;

    if (user.trialExpiresAt && new Date(user.trialExpiresAt) > now) {
      // Active trial
      subscriptionStatus = 'active_trial';
      daysRemaining = Math.ceil((new Date(user.trialExpiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      features = user.features || {};
    } else if (user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > now) {
      // Active subscription
      subscriptionStatus = 'active_subscription';
      daysRemaining = Math.ceil((new Date(user.subscriptionExpiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      features = user.features || {};
    } else if (user.gracePeriodExpiresAt && new Date(user.gracePeriodExpiresAt) > now) {
      // In grace period
      subscriptionStatus = 'grace_period';
      isInGracePeriod = true;
      daysRemaining = Math.ceil((new Date(user.gracePeriodExpiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      features = {}; // No features during grace period
    } else {
      // Expired - schedule for deletion
      subscriptionStatus = 'expired';
      
      // Schedule user data deletion if grace period has ended
      if (user.gracePeriodExpiresAt && new Date(user.gracePeriodExpiresAt) <= now) {
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
      subscriptionPlan: user.subscriptionPlan || 'none',
      daysRemaining,
      isInGracePeriod,
      features,
      maxDevices: user.maxDevices || 0,
      cloudStorageLimit: user.cloudStorageLimit || 0,
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
