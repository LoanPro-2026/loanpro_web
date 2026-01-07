import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { successResponse, errorResponse, ApiErrors } from '@/lib/apiResponse';
import { checkRateLimit, RateLimitPresets } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';

export async function GET() {
  const startTime = Date.now();
  let userId: string | null = null;
  
  try {
    // Authentication check
    const authResult = await auth();
    userId = authResult.userId;
    if (!userId) {
      logger.warn('Unauthorized access attempt', 'USER_PROFILE');
      return errorResponse(ApiErrors.UNAUTHORIZED);
    }

    // Rate limiting
    const rateLimitKey = `user-profile:${userId}`;
    if (!checkRateLimit(rateLimitKey, RateLimitPresets.API.limit, RateLimitPresets.API.windowMs)) {
      logger.warn('Rate limit exceeded', 'USER_PROFILE', { userId });
      return errorResponse(ApiErrors.RATE_LIMIT);
    }

    logger.info('Fetching user profile', 'USER_PROFILE', { userId });

    const client = await clientPromise;
    const db = client.db('AdminDB');

    // Fetch user info or create new user
    let user = await db.collection('users').findOne({ userId });
    
    if (!user) {
      // User doesn't exist in MongoDB - create new user record
      logger.info('New Clerk user, creating MongoDB user record', 'USER_PROFILE', { userId });
      
      const crypto = await import('crypto');
      const accessToken = crypto.randomBytes(48).toString('hex');
      
      const newUser = {
        userId,
        username: typeof authResult.sessionClaims?.email === 'string' ? authResult.sessionClaims.email.split('@')[0] : userId,
        email: typeof authResult.sessionClaims?.email === 'string' ? authResult.sessionClaims.email : '',
        accessToken,
        createdAt: new Date(),
        updatedAt: new Date(),
        devices: [],
        dataUsage: 0
      };
      
      const insertResult = await db.collection('users').insertOne(newUser);
      user = { ...newUser, _id: insertResult.insertedId };
      
      logger.info('New user created successfully', 'USER_PROFILE', { userId });
    }

    // Fetch current subscription info (including trials)
    const subscriptions = await db.collection('subscriptions').find({
      userId,
      status: 'active' // Both trial and paid subscriptions have status 'active' in your DB
    }).sort({ startDate: -1 }).toArray();
    
    let subscription = null;
    
    // Handle multiple active subscriptions (cleanup)
    if (subscriptions.length > 1) {
      logger.warn(`Found multiple active subscriptions`, 'USER_PROFILE', { 
        userId, 
        count: subscriptions.length 
      });
      
      // Keep the most recent subscription
      subscription = subscriptions[0];
      
      // Mark older subscriptions as superseded
      const olderSubscriptionIds = subscriptions.slice(1).map(s => s._id);
      await db.collection('subscriptions').updateMany(
        { _id: { $in: olderSubscriptionIds } },
        {
          $set: {
            status: 'superseded',
            supersededDate: new Date(),
            supersededReason: 'Multiple active subscriptions cleanup'
          }
        }
      );
      
      logger.info(`Cleaned up duplicate subscriptions`, 'USER_PROFILE', { 
        userId, 
        cleaned: olderSubscriptionIds.length 
      });
      
      console.log(`Cleaned up ${olderSubscriptionIds.length} duplicate active subscriptions`);
    } else if (subscriptions.length === 1) {
      subscription = subscriptions[0];
    }
    
    // Fetch all subscriptions for payment history
    const paymentHistory = await db.collection('subscriptions')
      .find({ userId }).toArray();
    const duration = Date.now() - startTime;

    // Handle non-subscribed users gracefully
    if (!subscription && paymentHistory.length === 0) {
      logger.info('Non-subscribed user profile fetched', 'USER_PROFILE', { userId, duration });
      return successResponse({
        user: {
          userId: user.userId,
          username: user.username,
          email: user.email,
          accessToken: null,
        },
        subscription: null,
        paymentHistory: [],
        isSubscribed: false
      });
    }

    // Return combined info for subscribed users
    logger.info('User profile fetched successfully', 'USER_PROFILE', { userId, duration });
    return successResponse({
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        accessToken: user.accessToken,
      },
      subscription: subscription ? {
        plan: subscription.plan || 'basic',
        billingPeriod: subscription.billingPeriod || 'monthly',
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
      } : null,
      paymentHistory: paymentHistory
        .filter(sub => sub.status !== 'superseded') // Filter out superseded subscriptions from payment history
        .map((sub) => ({
          paymentId: sub.paymentId,
          plan: sub.plan || 'unknown',
          startDate: sub.startDate,
          endDate: sub.endDate,
          status: sub.status,
          receiptUrl: sub.receiptUrl,
        })),
      isSubscribed: true
    });
  } catch (error) {
    logger.error('User profile API failed', error, 'USER_PROFILE', { userId });
    return errorResponse(ApiErrors.INTERNAL_ERROR);
  }
} 