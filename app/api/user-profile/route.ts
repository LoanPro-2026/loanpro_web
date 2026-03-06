import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { successResponse, errorResponse, ApiErrors } from '@/lib/apiResponse';
import { checkRateLimit, RateLimitPresets } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';
import { getBillingPeriod } from '@/lib/subscriptionHelpers';
import { ObjectId } from 'mongodb';
import Razorpay from 'razorpay';
import { POST as processPaymentSuccess } from '@/app/api/payment-success/route';
import crypto from 'crypto';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

interface ResolvedIdentity {
  email: string;
  username: string;
  fullName: string;
}

async function resolveUserIdentity(
  userId: string,
  authResult: Awaited<ReturnType<typeof auth>>
): Promise<ResolvedIdentity> {
  const claims = authResult.sessionClaims as Record<string, any> | undefined;
  let email =
    typeof claims?.email === 'string'
      ? claims.email
      : typeof claims?.email_address === 'string'
      ? claims.email_address
      : '';
  let username =
    typeof claims?.username === 'string'
      ? claims.username
      : typeof claims?.preferred_username === 'string'
      ? claims.preferred_username
      : '';
  let fullName =
    typeof claims?.full_name === 'string'
      ? claims.full_name
      : `${typeof claims?.given_name === 'string' ? claims.given_name : ''} ${typeof claims?.family_name === 'string' ? claims.family_name : ''}`.trim();

  if (!email || !username || !fullName) {
    const clerkSecret = process.env.CLERK_SECRET_KEY;
    if (clerkSecret) {
      try {
        const response = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
          headers: {
            Authorization: `Bearer ${clerkSecret}`,
          },
        });

        if (response.ok) {
          const clerkUser = await response.json();
          const primaryEmailId = clerkUser?.primary_email_address_id;
          const primaryEmail = Array.isArray(clerkUser?.email_addresses)
            ? clerkUser.email_addresses.find((entry: any) => entry?.id === primaryEmailId)
            : null;

          email = email || primaryEmail?.email_address || clerkUser?.email_addresses?.[0]?.email_address || '';
          username = username || clerkUser?.username || '';

          const firstName = clerkUser?.first_name || '';
          const lastName = clerkUser?.last_name || '';
          const derivedFullName = `${firstName} ${lastName}`.trim();
          fullName = fullName || derivedFullName || '';
        }
      } catch (error) {
        logger.warn('Failed to fetch user identity from Clerk API', 'USER_PROFILE', {
          userId,
          error: error instanceof Error ? error.message : 'unknown',
        });
      }
    }
  }

  const normalizedEmail = typeof email === 'string' ? email.trim() : '';
  const normalizedFullName = typeof fullName === 'string' ? fullName.trim() : '';
  const normalizedUsername =
    (typeof username === 'string' ? username.trim() : '') ||
    (normalizedFullName ? normalizedFullName.replace(/\s+/g, '') : '') ||
    (normalizedEmail ? normalizedEmail.split('@')[0] : '') ||
    userId;

  return {
    email: normalizedEmail,
    username: normalizedUsername,
    fullName: normalizedFullName,
  };
}

async function attemptPendingPaymentRecovery(userId: string, user: any, db: any) {
  try {
    const pendingOrders = await db
      .collection('order_intents')
      .find({
        userId,
        status: 'pending',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      })
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray();

    if (pendingOrders.length === 0) {
      return { recovered: false };
    }

    logger.info('Pending order(s) found, starting recovery check', 'USER_PROFILE', {
      userId,
      pendingCount: pendingOrders.length,
    });

    for (const pendingOrder of pendingOrders) {
      try {
        const paymentsResponse: any = await razorpay.orders.fetchPayments(pendingOrder.orderId);
        const capturedPayment = (paymentsResponse?.items || []).find(
          (payment: any) => payment.status === 'captured'
        );

        if (!capturedPayment) {
          continue;
        }

        const existingPayment = await db.collection('payments').findOne({
          paymentId: capturedPayment.id,
          userId,
        });

        if (existingPayment) {
          await db.collection('order_intents').updateOne(
            { _id: pendingOrder._id },
            {
              $set: {
                status: 'completed',
                completedAt: new Date(),
                recoveredAt: new Date(),
                recoveredBy: 'user-profile-check',
              },
            }
          );
          return { recovered: true, orderId: pendingOrder.orderId, paymentId: capturedPayment.id };
        }

        const recoveryBody = {
          razorpay_payment_id: capturedPayment.id,
          razorpay_order_id: pendingOrder.orderId,
          razorpay_signature: 'recovered_server_side',
          userId,
          username: user?.email || user?.username || userId,
          plan: pendingOrder.plan,
          billingPeriod: pendingOrder.billingPeriod || 'monthly',
          isRenewal: pendingOrder.paymentContext === 'renewal',
          isUpgrade: pendingOrder.paymentContext === 'upgrade',
        };

        const recoveryRequest = new Request('http://localhost/api/payment-success', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recoveryBody),
        });

        const recoveryResponse = await processPaymentSuccess(recoveryRequest);
        const recoveryResult = await recoveryResponse.json();

        if (recoveryResponse.ok && recoveryResult?.success) {
          await db.collection('order_intents').updateOne(
            { _id: pendingOrder._id },
            {
              $set: {
                status: 'completed',
                completedAt: new Date(),
                recoveredAt: new Date(),
                recoveredBy: 'user-profile-recovery',
              },
            }
          );

          logger.info('Recovered pending payment successfully', 'USER_PROFILE', {
            userId,
            orderId: pendingOrder.orderId,
            paymentId: capturedPayment.id,
          });

          return { recovered: true, orderId: pendingOrder.orderId, paymentId: capturedPayment.id };
        }

        logger.warn('Recovery attempt failed', 'USER_PROFILE', {
          userId,
          orderId: pendingOrder.orderId,
          recoveryStatus: recoveryResponse.status,
        });
      } catch (orderError) {
        logger.warn('Failed processing pending order during recovery', 'USER_PROFILE', {
          userId,
          orderId: pendingOrder.orderId,
          error: orderError instanceof Error ? orderError.message : 'unknown',
        });
      }
    }

    return { recovered: false };
  } catch (error) {
    logger.warn('Pending payment recovery check failed', 'USER_PROFILE', {
      userId,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return { recovered: false };
  }
}

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
    const resolvedIdentity = await resolveUserIdentity(userId, authResult);
    
    if (!user) {
      // Create new user WITHOUT accessToken if not found
      // Token will only be created after successful payment
      logger.info('New Clerk user, creating MongoDB user record', 'USER_PROFILE', { userId });
      
      const now = new Date();
      const newUser = {
        userId,
        username: resolvedIdentity.username,
        email: resolvedIdentity.email,
        fullName: resolvedIdentity.fullName,
        // accessToken is NOT created at signup - only after payment
        createdAt: now,
        updatedAt: now,
        devices: [],
        dataUsage: 0
      };
      
      await db.collection('users').updateOne(
        { userId },
        {
          $set: {
            username: newUser.username,
            email: newUser.email,
            fullName: newUser.fullName,
            updatedAt: now,
          },
          $setOnInsert: {
            userId,
            createdAt: now,
            devices: [],
            dataUsage: 0,
          },
        },
        { upsert: true }
      );

      user = await db.collection('users').findOne({ userId });
      
      logger.info('New user created successfully', 'USER_PROFILE', { userId });
    } else {
      const currentEmail = typeof user.email === 'string' ? user.email.trim() : '';
      const currentFullName = typeof user.fullName === 'string' ? user.fullName.trim() : '';
      const currentUsername = typeof user.username === 'string' ? user.username.trim() : '';
      const currentEmailPrefix = currentEmail ? currentEmail.split('@')[0] : '';

      const shouldUpdateUsername =
        !currentUsername || currentUsername === userId || currentUsername === currentEmailPrefix;

      const updates: Record<string, unknown> = {};
      if (!currentEmail && resolvedIdentity.email) updates.email = resolvedIdentity.email;
      if (!currentFullName && resolvedIdentity.fullName) updates.fullName = resolvedIdentity.fullName;
      if (shouldUpdateUsername && resolvedIdentity.username && resolvedIdentity.username !== currentUsername) {
        updates.username = resolvedIdentity.username;
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date();
        await db.collection('users').updateOne({ userId }, { $set: updates });
        user = { ...user, ...updates };
        logger.info('Backfilled missing user identity fields', 'USER_PROFILE', {
          userId,
          updatedKeys: Object.keys(updates),
        });
      }
    }

    if (!user) {
      logger.error('User record missing after initialization', new Error('USER_RECORD_MISSING'), 'USER_PROFILE', { userId });
      return errorResponse(ApiErrors.INTERNAL_ERROR);
    }

    // Recover pending successful payments if user closed tab before payment-success callback
    const recoveryResult = await attemptPendingPaymentRecovery(userId, user, db);
    if (recoveryResult.recovered) {
      logger.info('Subscription/payment recovered before profile fetch', 'USER_PROFILE', {
        userId,
        orderId: recoveryResult.orderId,
        paymentId: recoveryResult.paymentId,
      });
    }

    // Fetch current subscription info (including trials and cancelled)
    const subscriptions = await db.collection('subscriptions').find({
      userId,
      status: { $in: ['active', 'trial', 'active_subscription', 'cancelled'] }
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
    
    // Fetch payment and cancellation history
    const [payments, cancellations] = await Promise.all([
      db.collection('payments').find({ userId }).sort({ createdAt: -1 }).toArray(),
      db.collection('cancellations').find({ userId }).sort({ requestDate: -1 }).toArray(),
    ]);
    const duration = Date.now() - startTime;

    // Handle non-subscribed users gracefully
    if (!subscription) {
      logger.info('Non-subscribed user profile fetched', 'USER_PROFILE', { userId, duration });
      return successResponse({
        user: {
          userId: user.userId,
          username: user.username,
          email: user.email,
          accessToken: null, // No token for non-subscribed users
        },
        subscription: null,
        paymentHistory: [],
        isSubscribed: false
      });
    }

    // Check if subscription is cancelled
    const isCancelled = subscription.status === 'cancelled';
    
    // Fetch cancellation details if cancelled
    let cancellationInfo = null;
    if (isCancelled && subscription.cancellationId) {
      try {
        const cancellation = await db.collection('cancellations').findOne({
          _id: new ObjectId(subscription.cancellationId)
        });
        if (cancellation) {
          cancellationInfo = {
            reason: cancellation.reason,
            cancelledDate: cancellation.requestDate,
            refundStatus: cancellation.status,
            refundAmount: cancellation.netRefund,
            totalPaid: cancellation.totalPaid,
            daysUsed: cancellation.daysUsed,
          };
        }
      } catch (err) {
        logger.warn('Failed to fetch cancellation details', 'USER_PROFILE', { userId });
      }
    }

    // Ensure active/trial users have an access token (but not cancelled users)
    if (!isCancelled && !user.accessToken) {
      const newAccessToken = crypto.randomBytes(48).toString('hex');
      await db.collection('users').updateOne(
        { userId },
        { $set: { accessToken: newAccessToken, updatedAt: new Date() } }
      );
      user.accessToken = newAccessToken;
      logger.info('Generated missing access token for subscribed user', 'USER_PROFILE', { userId });
    }

    // Return combined info for users with subscription (active, trial, or cancelled)
    logger.info('User profile fetched successfully', 'USER_PROFILE', { userId, duration, status: subscription.status });
    return successResponse({
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        accessToken: isCancelled ? null : user.accessToken, // No token for cancelled users
      },
      subscription: subscription ? {
        plan: subscription.plan || subscription.subscriptionPlan || 'basic',
        billingPeriod: getBillingPeriod(subscription), // Use helper for consistent billing period format
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        cancelledDate: subscription.cancelledDate,
        cancellationReason: subscription.cancellationReason,
      } : null,
      cancellation: cancellationInfo, // Include cancellation details if available
      paymentHistory: [
        ...payments.map((payment) => ({
          id: payment.paymentId || payment._id?.toString(),
          type: 'payment',
          action: payment.isUpgrade
            ? 'upgrade'
            : payment.isRenewal
            ? 'renewal'
            : 'purchase',
          plan: payment.plan || 'unknown',
          billingPeriod: payment.billingPeriod || 'monthly',
          amount: payment.amount || 0,
          status: payment.status || 'completed',
          date: payment.createdAt || payment.capturedAt || payment.completedAt || payment.updatedAt,
          receiptUrl: payment.receiptUrl || (payment.paymentId ? `https://dashboard.razorpay.com/payments/${payment.paymentId}` : undefined),
        })),
        ...cancellations.map((cancellation) => ({
          id: cancellation._id?.toString(),
          type: 'cancellation',
          action: 'cancellation',
          plan: cancellation.plan || 'unknown',
          billingPeriod: cancellation.billingPeriod || 'monthly',
          amount: cancellation.netRefund ? -Math.abs(cancellation.netRefund) : 0,
          status: cancellation.status || 'pending_review',
          date: cancellation.requestDate || cancellation.processedDate,
          refundAmount: cancellation.netRefund,
          totalPaid: cancellation.totalPaid,
        })),
      ]
        .filter((entry) => entry.date)
        .sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime()),
      isSubscribed: !isCancelled // Only true if not cancelled
    });
  } catch (error) {
    logger.error('User profile API failed', error, 'USER_PROFILE', { userId });
    return errorResponse(ApiErrors.INTERNAL_ERROR);
  }
} 