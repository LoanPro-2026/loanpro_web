export const runtime = "nodejs";
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { SubscriptionService } from '@/services/subscriptionService';
import clientPromise from '@/lib/mongodb';
import crypto from 'crypto';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { validatePaymentResponse } from '@/lib/validation';
import { logger } from '@/lib/logger';
import emailService from '@/services/emailService';
import { getRazorpayClient } from '@/lib/razorpayClient';
import { enforceRequestRateLimit, parseJsonRequest, toSafeErrorResponse, withRecovery } from '@/lib/apiSafety';

const SUCCESSFUL_PAYMENT_STATUS_REGEX = /^(captured|completed|success|successful|paid)$/i;
const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trial', 'active_subscription'];

export async function POST(req: Request) {
  const startTime = Date.now();
  logger.info('Payment webhook received', 'PAYMENT_SUCCESS');
  
  try {
    const { client: razorpay, error: razorpayInitError, keyId } = getRazorpayClient();
    if (!razorpay) {
      return errorResponse({
        code: 'PAYMENT_CONFIG_ERROR',
        message: razorpayInitError || 'Payment system is not configured',
        statusCode: 500,
      });
    }

    const parsedBody = await parseJsonRequest<Record<string, any>>(req, { maxBytes: 96 * 1024 });
    if (!parsedBody.ok) {
      return parsedBody.response;
    }

    const body = parsedBody.data as Record<string, any>;
    const normalizedPlan = typeof body.plan === 'string' && body.plan.length > 0
      ? body.plan.charAt(0).toUpperCase() + body.plan.slice(1).toLowerCase()
      : body.plan;
    const normalizedBody: Record<string, any> = {
      ...body,
      plan: normalizedPlan,
    };
    logger.info('Payment webhook body parsed', 'PAYMENT_SUCCESS', { 
      paymentId: normalizedBody.razorpay_payment_id,
      orderId: normalizedBody.razorpay_order_id,
      plan: normalizedBody.plan,
    });
    
    // Check if this is a webhook call or a direct frontend call
    const isWebhookCall = req.headers.get('x-razorpay-signature') !== null;
    const isDirectCall = !isWebhookCall;
    
    // Check if we're using Razorpay test mode (regardless of NODE_ENV)
    const isRazorpayTestMode = keyId.includes('test');
    
    logger.info('Payment environment check', 'PAYMENT_SUCCESS', {
      NODE_ENV: process.env.NODE_ENV,
      isRazorpayTestMode,
      isWebhookCall,
      isDirectCall
    });
    
    // Only require webhook signature for production Razorpay + webhook calls
    if (!isRazorpayTestMode && process.env.NODE_ENV === 'production' && isWebhookCall) {
      // Production Razorpay with webhook call - verify signature
      const headersList = await headers();
      const signature = headersList.get('x-razorpay-signature');
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      
      if (!signature) {
        logger.warn('Missing webhook signature', 'PAYMENT_SUCCESS');
        return errorResponse({
          code: 'MISSING_SIGNATURE',
          message: 'No signature provided',
          statusCode: 400,
        });
      }
      
      if (!webhookSecret) {
        logger.error('Razorpay webhook secret not configured', new Error('Missing RAZORPAY_WEBHOOK_SECRET'), 'PAYMENT_SUCCESS');
        return errorResponse({
          code: 'CONFIG_ERROR',
          message: 'Webhook configuration error',
          statusCode: 500,
        });
      }
      
      // Verify Razorpay webhook signature using HMAC-SHA256
      // Formula: HMAC_SHA256({order_id}|{payment_id}, webhook_secret)
      const { razorpay_order_id, razorpay_payment_id } = normalizedBody;
      const message = `${razorpay_order_id}|${razorpay_payment_id}`;
      const calculatedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(message)
        .digest('hex');
      
      if (signature !== calculatedSignature) {
        logger.error('Webhook signature verification failed', new Error('Invalid signature'), 'PAYMENT_SUCCESS', {
          expected: calculatedSignature,
          received: signature,
          paymentId: razorpay_payment_id
        });
        return errorResponse({
          code: 'INVALID_SIGNATURE',
          message: 'Webhook signature verification failed',
          statusCode: 401,
        });
      }
      
      logger.info('Webhook signature verified successfully', 'PAYMENT_SUCCESS', {
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id
      });
    } else {
      // Test mode, development, or direct API call - skip signature validation
      if (isRazorpayTestMode) {
        logger.info('Test mode - skipping signature validation', 'PAYMENT_SUCCESS');
      } else if (isDirectCall) {
        logger.info('Direct API call - skipping signature validation', 'PAYMENT_SUCCESS');
      }
    }

    // Rate limiting - prevent payment spam (higher limit for webhooks)
    const rateLimitResponse = enforceRequestRateLimit({
      request: req,
      scope: 'payment-success',
      limit: 20,
      windowMs: 60000,
      userId: typeof normalizedBody.userId === 'string' ? normalizedBody.userId : undefined,
    });
    if (rateLimitResponse) { // 20 per minute
      logger.warn('Rate limit exceeded for payment', 'PAYMENT_SUCCESS', { 
        paymentId: normalizedBody.razorpay_payment_id 
      });
      return rateLimitResponse;
    }

    // Validate payment data
    const validation = validatePaymentResponse(normalizedBody);
    if (!validation.isValid()) {
      const error = validation.getFirstError();
      logger.error('Payment validation failed', new Error(error?.message), 'PAYMENT_SUCCESS', {
        missing: validation.errors.map(e => e.field)
      });
      return errorResponse({
        code: 'VALIDATION_ERROR',
        message: error?.message || 'Missing required fields',
        statusCode: 400,
      });
    }

    // Handle payment success
    const { razorpay_payment_id, razorpay_order_id, email, fullName, username } = normalizedBody;

    // IDEMPOTENCY: Check if payment already processed
    const db = (await clientPromise).db('AdminDB');
    
    // Fetch the order details to get the actual expected amount
    const orderIntent = await db.collection('order_intents').findOne({
      orderId: razorpay_order_id
    });

    if (!orderIntent?.userId) {
      logger.warn('Order intent missing or invalid during payment finalization', 'PAYMENT_SUCCESS', {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
      });
      return errorResponse({
        code: 'ORDER_INTENT_NOT_FOUND',
        message: 'Order intent not found for this payment',
        statusCode: 409,
      });
    }

    const resolvedUserId = String(orderIntent.userId).trim();
    const resolvedPlan = typeof orderIntent.plan === 'string' && orderIntent.plan.length > 0
      ? orderIntent.plan.charAt(0).toUpperCase() + orderIntent.plan.slice(1).toLowerCase()
      : 'Basic';
    const resolvedBillingPeriod = orderIntent.billingPeriod === 'annually' ? 'annually' : 'monthly';
    const resolvedPaymentContext = typeof orderIntent.paymentContext === 'string'
      ? orderIntent.paymentContext.toLowerCase()
      : 'new';
    const resolvedIsUpgrade = resolvedPaymentContext === 'upgrade';
    const resolvedIsRenewal = resolvedPaymentContext === 'renewal';
    const userRecord = await db.collection('users').findOne(
      { userId: resolvedUserId },
      { projection: { email: 1, fullName: 1, username: 1 } }
    );
    const resolvedEmail = userRecord?.email || email || '';
    const resolvedFullName = userRecord?.fullName || fullName || '';
    const resolvedUsername = userRecord?.username || username || (resolvedEmail ? resolvedEmail.split('@')[0] : resolvedUserId);
    const orderCoupon = orderIntent?.coupon && typeof orderIntent.coupon === 'object'
      ? orderIntent.coupon
      : null;
    const resolvedCouponCode = orderCoupon?.code || (typeof orderIntent?.couponCode === 'string' ? orderIntent.couponCode.toUpperCase() : null);
    const baseAmountRupees = Math.round(Number(orderIntent?.baseAmount || orderIntent?.amount || 0) / 100);
    const discountAmountRupees = Math.round(Number(orderIntent?.discountAmount || 0) / 100);
    
    const paymentAmount = orderIntent?.amount || 0; // Amount in paise from Razorpay
    
    logger.info('Order details fetched', 'PAYMENT_SUCCESS', {
      orderId: razorpay_order_id,
      amount: paymentAmount,
      amountInRupees: paymentAmount / 100
    });

    logger.info('Processing payment', 'PAYMENT_SUCCESS', {
      userId: resolvedUserId,
      username: resolvedUsername,
      plan: resolvedPlan,
      billingPeriod: resolvedBillingPeriod,
      isUpgrade: resolvedIsUpgrade,
      isRenewal: resolvedIsRenewal
    });
    
    const existingPayment = await db.collection('payments').findOne({
      paymentId: razorpay_payment_id,
      $or: [
        { status: { $in: ['captured', 'processing', 'completed', 'success', 'successful', 'paid'] } },
        { status: { $regex: SUCCESSFUL_PAYMENT_STATUS_REGEX } },
      ],
    });

    if (existingPayment) {
      logger.warn('Duplicate payment attempt', 'PAYMENT_SUCCESS', { 
        paymentId: razorpay_payment_id, 
        userId: existingPayment.userId || resolvedUserId
      });
      
      // Return existing subscription
      const subscription = await db.collection('subscriptions').findOne({ 
        userId: existingPayment.userId || resolvedUserId,
        status: { $in: ['active', 'active_subscription'] }
      });
      
      return successResponse({
        subscription,
        payment: existingPayment,
        alreadyProcessed: true,
        redirectUrl: '/profile'
      }, 'Payment already processed');
    }

    // SECURITY: Always verify payment with Razorpay server-side before granting access
    let razorpayPayment: any;
    try {
      razorpayPayment = await withRecovery(
        () => razorpay.payments.fetch(razorpay_payment_id),
        {
          operation: 'razorpay-payment-fetch',
          context: 'PAYMENT_SUCCESS',
          attempts: 2,
          baseDelayMs: 300,
        }
      );
    } catch (verificationError) {
      logger.error('Failed to verify payment with Razorpay', verificationError as Error, 'PAYMENT_SUCCESS', {
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
      });
      return errorResponse({
        code: 'PAYMENT_VERIFICATION_FAILED',
        message: 'Unable to verify payment with Razorpay',
        statusCode: 400,
      });
    }

    if (!razorpayPayment || razorpayPayment.order_id !== razorpay_order_id) {
      logger.warn('Payment/order mismatch detected', 'PAYMENT_SUCCESS', {
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        razorpayOrderId: razorpayPayment?.order_id,
      });
      return errorResponse({
        code: 'ORDER_PAYMENT_MISMATCH',
        message: 'Payment does not belong to this order',
        statusCode: 400,
      });
    }

    if (razorpayPayment.status !== 'captured') {
      logger.warn('Payment not captured', 'PAYMENT_SUCCESS', {
        paymentId: razorpay_payment_id,
        status: razorpayPayment.status,
      });
      return errorResponse({
        code: 'PAYMENT_NOT_CAPTURED',
        message: `Payment status is '${razorpayPayment.status}', expected 'captured'`,
        statusCode: 400,
      });
    }

    if (orderIntent?.amount && razorpayPayment.amount !== orderIntent.amount) {
      logger.warn('Payment amount mismatch with order intent', 'PAYMENT_SUCCESS', {
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        expectedAmount: orderIntent.amount,
        receivedAmount: razorpayPayment.amount,
      });
      return errorResponse({
        code: 'AMOUNT_MISMATCH',
        message: 'Payment amount does not match order amount',
        statusCode: 400,
      });
    }

    // Normalize plan name and set features
    let subscriptionPlan = resolvedPlan;
    let features = {};
    let maxDevices = 1;
    let cloudStorageLimit = 0;
    
    switch(resolvedPlan) {
      case 'Basic':
        features = {
          biometrics: false,
          autoSync: false,
          cloudDatabase: false,
          mobileSync: false,
          cloudBackup: false,
          analytics: true,
          prioritySupport: false,
          customSubdomain: false,
          apiAccess: false
        };
        maxDevices = 1;
        cloudStorageLimit = 0; // No cloud storage
        break;
      case 'Pro':
        features = {
          biometrics: false,
          autoSync: true,
          cloudDatabase: true,
          mobileSync: true,
          cloudBackup: true,
          analytics: true,
          prioritySupport: true,
          customSubdomain: true,
          apiAccess: true
        };
        maxDevices = 1;
        cloudStorageLimit = 15 * 1024 * 1024 * 1024; // 15GB
        break;
      case 'Enterprise':
        features = {
          biometrics: false,
          autoSync: true,
          cloudDatabase: true,
          mobileSync: true,
          cloudBackup: true,
          analytics: true,
          prioritySupport: true,
          customSubdomain: true,
          apiAccess: true
        };
        maxDevices = 2;
        cloudStorageLimit = 15 * 1024 * 1024 * 1024; // 15GB
        break;
      default:
        subscriptionPlan = 'Basic';
        features = {
          biometrics: false,
          autoSync: false,
          cloudDatabase: false,
          mobileSync: false,
          cloudBackup: false,
          analytics: true,
          prioritySupport: false,
          customSubdomain: false,
          apiAccess: false
        };
        maxDevices = 1;
        cloudStorageLimit = 0;
    }

    // Calculate subscription expiry based on billing period
    const subscriptionExpiresAt = new Date();
    if (resolvedBillingPeriod === 'annually') {
      // Annual subscription - add 1 year
      subscriptionExpiresAt.setFullYear(subscriptionExpiresAt.getFullYear() + 1);
    } else {
      // Monthly subscription - add 30 days
      subscriptionExpiresAt.setDate(subscriptionExpiresAt.getDate() + 30);
    }

    logger.info('Subscription expiry calculated', 'PAYMENT_SUCCESS', {
      plan: resolvedPlan,
      billingPeriod: resolvedBillingPeriod,
      startDate: new Date().toISOString(),
      expiryDate: subscriptionExpiresAt.toISOString()
    });

    // Map billing period to subscription type for subscription service
    const subscriptionTypeMap: { [key: string]: 'monthly' | '6months' | 'yearly' } = {
      'monthly': 'monthly',
      'annually': 'yearly'
    };
    const subscriptionType = subscriptionTypeMap[resolvedBillingPeriod] || 'monthly';

    // Calculate grace period expiry (15 days after subscription ends)
    const gracePeriodExpiresAt = new Date(subscriptionExpiresAt);
    gracePeriodExpiresAt.setDate(gracePeriodExpiresAt.getDate() + 15);

    // Generate username from email
    const generatedUsername = String(resolvedUsername || resolvedEmail.split('@')[0] || resolvedUserId).replace(/\./g, '');

    // IMPORTANT: Use MongoDB transaction for atomic operations
    const client = await clientPromise;
    // Reuse existing db connection from above
    const session = client.startSession();

    // Declare subscription outside transaction scope so it's accessible later
    let subscription: any = null;

    try {
      await session.withTransaction(async () => {
        // Find existing subscriptions to supersede
        // Only supersede paid subscriptions when buying a new paid plan
        // Don't supersede trials when purchasing first paid subscription
        const existingSubscriptions = await db.collection('subscriptions').find(
          {
            userId: resolvedUserId,
            status: { $in: ACTIVE_SUBSCRIPTION_STATUSES },
            plan: { $ne: 'trial' } // Only supersede paid plans, not trial
          },
          { session }
        ).toArray();

        if (existingSubscriptions.length > 0) {
          logger.info('Superseding existing paid subscriptions', 'PAYMENT_SUCCESS', { 
            userId: resolvedUserId,
            count: existingSubscriptions.length,
            plans: existingSubscriptions.map(s => s.plan)
          });
          
          // Supersede only paid subscriptions (not trials)
          await db.collection('subscriptions').updateMany(
            { 
              userId: resolvedUserId,
              status: { $in: ACTIVE_SUBSCRIPTION_STATUSES },
              plan: { $ne: 'trial' }
            },
            {
              $set: {
                status: 'superseded',
                supersededDate: new Date(),
                supersededReason: 'Replaced by new subscription purchase'
              }
            },
            { session }
          );
        } else {
          // If no paid subscriptions, mark trial as completed if exists
          const trialSubscription = await db.collection('subscriptions').findOne(
            { userId: resolvedUserId, status: 'trial', plan: 'trial' },
            { session }
          );
          
          if (trialSubscription) {
            logger.info('Converting trial to paid subscription', 'PAYMENT_SUCCESS', { userId: resolvedUserId });
            await db.collection('subscriptions').updateOne(
              { _id: trialSubscription._id },
              {
                $set: {
                  status: 'completed',
                  completedDate: new Date(),
                  completedReason: 'Trial converted to paid subscription'
                }
              },
              { session }
            );
          }
        }

        // Create subscription in MongoDB (within transaction)
        const subscriptionService = new SubscriptionService();
        subscription = await subscriptionService.createSubscription({
          userId: resolvedUserId,
          username: generatedUsername,
          subscriptionType: subscriptionType, // Use mapped subscription type
          paymentId: razorpay_payment_id,
          receiptUrl: `https://dashboard.razorpay.com/payments/${razorpay_payment_id}`
        }, session);

        // Upsert user in users collection
        // Generate a secure access token ONLY when subscription is created (not on signup)
        const freshAccessToken = crypto.randomBytes(48).toString('hex');
        const userUpdate: Record<string, unknown> = {
          userId: resolvedUserId,
          lastSubscribedAt: new Date()
        };
        if (resolvedEmail) {
          userUpdate.email = resolvedEmail;
        }
        if (resolvedFullName) {
          userUpdate.fullName = resolvedFullName;
        }
        await db.collection('users').updateOne(
          { userId: resolvedUserId },
          {
            $set: userUpdate,
            $setOnInsert: {
                username: generatedUsername,
                createdAt: new Date(),
                accessToken: freshAccessToken,
                devices: [],
                dataUsage: 0
              }
            },
            { upsert: true, session }
          );

        // Update subscription record with plan details (single source of truth for subscription data)
        const subscriptionUpdate: any = {
          plan: subscriptionPlan,
          billingPeriod: resolvedBillingPeriod,
          status: 'active',
          endDate: subscriptionExpiresAt,
          gracePeriodEndsAt: gracePeriodExpiresAt,
          updatedAt: new Date()
        };

        // If this is an upgrade, preserve the original start date and update end date
        if (resolvedIsUpgrade) {
          const existingSubscription = await db.collection('subscriptions').findOne(
            { userId: resolvedUserId, status: 'superseded' },
            { sort: { supersededDate: -1 }, session }
          );
          if (existingSubscription) {
            // Keep the original start date, but extend the end date based on remaining days
            subscriptionUpdate.startDate = existingSubscription.startDate;
            // The expiry date calculation should already account for remaining days from upgrade calculation
          }
          subscriptionUpdate.plan = resolvedPlan; // Update plan field
          subscriptionUpdate.isUpgraded = true;
          subscriptionUpdate.upgradedDate = new Date();
        } else if (resolvedIsRenewal) {
          // For renewals, extend the subscription from current end date or now (whichever is later)
          const existingSubscription = await db.collection('subscriptions').findOne(
            { userId: resolvedUserId, status: 'superseded' },
            { sort: { supersededDate: -1 }, session }
          );
          if (existingSubscription) {
            subscriptionUpdate.startDate = existingSubscription.startDate; // Keep original start date
            
            // Calculate new expiry date from the later of current expiry date or now
            const currentExpiryDate = new Date(existingSubscription.endDate);
            const today = new Date();
            const renewalStartDate = currentExpiryDate > today ? currentExpiryDate : today;
            
            // Calculate new expiry date based on billing period
            const newExpiryDate = new Date(renewalStartDate);
            if (resolvedBillingPeriod === 'annually') {
              newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
            } else {
              newExpiryDate.setDate(newExpiryDate.getDate() + 30);
            }
            
            subscriptionUpdate.endDate = newExpiryDate;
            subscriptionUpdate.gracePeriodEndsAt = new Date(newExpiryDate.getTime() + (15 * 24 * 60 * 60 * 1000)); // 15 days grace period
            subscriptionUpdate.isRenewed = true;
            subscriptionUpdate.renewedDate = new Date();
            subscriptionUpdate.lastRenewalDate = new Date();
          }
        } else {
          // New subscription
          subscriptionUpdate.startDate = new Date();
        }

        await db.collection('subscriptions').updateOne(
          { userId: resolvedUserId, _id: subscription._id },
          { $set: subscriptionUpdate },
          { session }
            );

        // Create payment record for tracking and invoicing
        const paymentRecord = {
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      userId: resolvedUserId,
      subscriptionId: subscription._id.toString(),
      plan: subscriptionPlan,
      billingPeriod: resolvedBillingPeriod,
      amount: Math.round(paymentAmount / 100), // Convert paise to rupees for storage and refund calculations
      baseAmount: baseAmountRupees,
      discountAmount: discountAmountRupees,
      couponCode: resolvedCouponCode,
      coupon: orderCoupon,
      currency: 'INR',
      status: 'captured',
      paymentMethod: 'razorpay',
      isUpgrade: resolvedIsUpgrade,
      isRenewal: resolvedIsRenewal,
      receiptUrl: razorpay_payment_id ? `https://dashboard.razorpay.com/payments/${razorpay_payment_id}` : undefined,
          createdAt: new Date(),
          capturedAt: new Date()
        };
        
        await db.collection('payments').insertOne(paymentRecord, { session });

                if (resolvedCouponCode) {
                  await db.collection('coupons').updateOne(
                    { code: resolvedCouponCode },
                    {
                      $inc: { usedCount: 1 },
                      $set: { updatedAt: new Date(), lastUsedAt: new Date() },
                    },
                    { session }
                  );
                }

        // Mark order intent as completed
        await db.collection('order_intents').updateOne(
          { orderId: razorpay_order_id },
                  {
                    $set: {
                      status: 'completed',
                      completedAt: new Date(),
                      paymentId: razorpay_payment_id,
                      couponCode: resolvedCouponCode,
                      coupon: orderCoupon,
                    },
                  },
          { session }
        );
      }); // End transaction

      logger.info('Transaction completed successfully', 'PAYMENT_SUCCESS', { userId: resolvedUserId });
    } catch (transactionError) {
      logger.error('Transaction failed, rolled back', transactionError as Error, 'PAYMENT_SUCCESS');
      throw transactionError;
    } finally {
      await session.endSession();
    }

    // Verify subscription was created
    if (!subscription) {
      throw new Error('Subscription creation failed');
    }

    const duration = Date.now() - startTime;
    logger.info('Payment processed successfully', 'PAYMENT_SUCCESS', {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      duration,
      subscriptionId: subscription._id
    });

    try {
      const userRecord = await db.collection('users').findOne(
        { userId: resolvedUserId },
        { projection: { email: 1, username: 1, fullName: 1 } }
      );
      const finalResolvedEmail = userRecord?.email || resolvedEmail || '';
      const resolvedName =
        userRecord?.fullName ||
        userRecord?.username ||
        resolvedFullName ||
        (finalResolvedEmail ? finalResolvedEmail.split('@')[0] : 'Customer');

      if (finalResolvedEmail && finalResolvedEmail.includes('@')) {
        const emailData = {
          userName: resolvedName,
          userEmail: finalResolvedEmail,
          plan: String(subscriptionPlan || 'basic'),
          billingPeriod: resolvedBillingPeriod as 'monthly' | 'annually',
          amount: Math.round(paymentAmount / 100),
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          receiptUrl: razorpay_payment_id
            ? `https://dashboard.razorpay.com/payments/${razorpay_payment_id}`
            : undefined,
          endDate: subscriptionExpiresAt
        };

        const sendEmail = resolvedIsUpgrade
          ? emailService.sendSubscriptionUpgradeEmail(emailData)
          : resolvedIsRenewal
          ? emailService.sendSubscriptionRenewalEmail(emailData)
          : emailService.sendSubscriptionPurchaseEmail(emailData);

        Promise.resolve(sendEmail).catch(err => {
          logger.warn('Subscription email failed', 'PAYMENT_SUCCESS', {
            userId: resolvedUserId,
            error: err instanceof Error ? err.message : 'unknown'
          });
        });
      } else {
        logger.warn('No valid email address for subscription email', 'PAYMENT_SUCCESS', {
          userId: resolvedUserId,
          resolvedEmail: finalResolvedEmail
        });
      }
    } catch (emailError) {
      logger.warn('Failed to prepare subscription email', 'PAYMENT_SUCCESS', {
        userId: resolvedUserId,
        error: emailError instanceof Error ? emailError.message : 'unknown'
      });
    }

    // Return success with detailed confirmation
    return successResponse({
      subscription: {
        id: subscription._id,
        plan: subscriptionPlan,
        billingPeriod: resolvedBillingPeriod,
        expiresAt: subscriptionExpiresAt,
        features,
        maxDevices,
        status: 'active'
      },
      payment: {
        id: razorpay_payment_id,
        orderId: razorpay_order_id,
        date: new Date()
      },
      welcome: {
        title: '🎉 Welcome to LoanPro!',
        message: `Your ${subscriptionPlan} subscription is now active`,
        nextSteps: [
          'Download the desktop app',
          'Complete initial setup',
          'Explore your features'
        ]
      },
      redirectUrl: '/profile'
    }, 'Payment processed and subscription created successfully');
  } catch (error) {
    logger.error('Payment processing failed', error as Error, 'PAYMENT_SUCCESS', {
      stack: error instanceof Error ? error.stack : undefined
    });

    return toSafeErrorResponse(error, 'PAYMENT_SUCCESS', 'Error processing payment');
  }
}